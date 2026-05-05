import { useMutation, useQueryClient } from "@tanstack/react-query";
import { differenceInDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { checkFeeConflicts } from "@/lib/booking-conflicts";
import type { GroupBooking } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";

export type UpdateGroupBookingPayload = {
  contact: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  total: string;
  deposit: string;
  status: string;
  notes: string;
  roomIds: string[];
  originalRoomIds: string[];
  roomCheckIn: Record<string, string>;
  roomCheckOut: Record<string, string>;
  roomNotes: Record<string, string>;
};

export type SaveGuestItem = {
  roomUnitId: string;
  guestNames: string[];
  extraGuestNames: string[];
  ubdDocuments: string[];
  earlyFee: number;
  lateFee: number;
  extraAccom: number;
};

interface Callbacks {
  onUpdateSuccess: (params: { newTotal: number; newDeposit: number | null }) => void;
  onGuestsSaved: (result: { newNumGuests: number; newTotalPrice?: number }) => void;
}

export function useGroupBookingDetailsMutations(
  booking: GroupBooking | null,
  bookingCalc: { price_per_person_per_night: number } | null | undefined,
  callbacks: Callbacks,
) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const updateBookingMutation = useMutation({
    mutationFn: async (payload: UpdateGroupBookingPayload) => {
      if (!booking) return;
      const depositNum = payload.deposit ? parseFloat(payload.deposit) : null;
      const { error } = await supabase.from("group_bookings").update({
        contact_person: payload.contact,
        phone: payload.phone || null,
        check_in_date: payload.checkIn,
        check_out_date: payload.checkOut,
        total_price: parseFloat(payload.total),
        deposit_amount: depositNum,
        status: payload.status,
        admin_notes: payload.notes || null,
        room_unit_ids: payload.roomIds,
      }).eq("id", booking.id);
      if (error) throw error;

      const removedRoomIds = payload.originalRoomIds.filter(id => !payload.roomIds.includes(id));
      if (removedRoomIds.length > 0) {
        const { error: delErr } = await supabase
          .from("group_booking_room_assignments")
          .delete()
          .eq("group_booking_id", booking.id)
          .in("room_unit_id", removedRoomIds);
        if (delErr) throw delErr;
      }

      for (const roomId of payload.roomIds) {
        const { error: upsertErr } = await supabase
          .from("group_booking_room_assignments")
          .upsert({
            group_booking_id: booking.id,
            room_unit_id: roomId,
            check_in_override: payload.roomCheckIn[roomId] || null,
            check_out_override: payload.roomCheckOut[roomId] || null,
            room_notes: payload.roomNotes[roomId] || null,
          }, { onConflict: "group_booking_id,room_unit_id" });
        if (upsertErr) throw upsertErr;
      }
    },
    onSuccess: (_, payload) => {
      if (!booking) return;
      const newDeposit = payload.deposit ? parseFloat(payload.deposit) : null;
      const newTotal   = parseFloat(payload.total) || Number(booking.total_price);
      queryClient.setQueryData<GroupBooking[]>(QK.groupBookings(), old =>
        old?.map(b => b.id === booking.id
          ? {
              ...b,
              contact_person: payload.contact,
              phone: payload.phone || null,
              check_in_date: payload.checkIn,
              check_out_date: payload.checkOut,
              total_price: newTotal,
              deposit_amount: newDeposit,
              status: payload.status,
              admin_notes: payload.notes || null,
              room_unit_ids: payload.roomIds,
            }
          : b
        )
      );
      queryClient.invalidateQueries({ queryKey: QK.adminCalendarReservations() });
      queryClient.invalidateQueries({ queryKey: QK.adminCalendarGroupBookings() });
      queryClient.invalidateQueries({ queryKey: QK.groupBookings() });
      queryClient.invalidateQueries({ queryKey: QK.groupRoomAssignments(booking.id) });
      toast({ title: t("groupBookings.updated") });
      callbacks.onUpdateSuccess({ newTotal, newDeposit });
    },
    onError: (e: Error) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const saveGuestsMutation = useMutation({
    mutationFn: async (items: SaveGuestItem[]) => {
      if (!booking) return;
      for (const item of items) {
        if (item.earlyFee > 0 || item.lateFee > 0) {
          const { earlyConflict, lateConflict } = await checkFeeConflicts(
            item.roomUnitId,
            booking.check_in_date,
            booking.check_out_date,
            item.earlyFee,
            item.lateFee,
          );
          if (earlyConflict) throw new Error(t("common.earlyCheckinConflict"));
          if (lateConflict)  throw new Error(t("common.lateCheckoutConflict"));
        }
      }
      for (const item of items) {
        const { error } = await supabase
          .from("group_booking_room_assignments")
          .upsert({
            group_booking_id: booking.id,
            room_unit_id: item.roomUnitId,
            guest_names: item.guestNames,
            extra_guest_names: item.extraGuestNames,
            ubd_documents: item.ubdDocuments,
            early_checkin_fee: item.earlyFee,
            late_checkout_fee: item.lateFee,
            extra_accommodation: item.extraAccom,
          }, { onConflict: "group_booking_id,room_unit_id" });
        if (error) throw error;
      }
      const baseGuests  = items.reduce((s, p) => s + p.guestNames.length, 0);
      const extraGuests = items.reduce((s, p) => s + p.extraAccom, 0);
      const newNumGuests = baseGuests + extraGuests;
      const nights = differenceInDays(parseISO(booking.check_out_date), parseISO(booking.check_in_date));
      const updatePayload: Record<string, unknown> = { num_guests: newNumGuests };
      if (bookingCalc && nights > 0) {
        const pppn = bookingCalc.price_per_person_per_night;
        const ubdCount = items.reduce((s, p) => s + p.ubdDocuments.filter(d => d?.trim()).length, 0);
        updatePayload.total_price = Number((pppn * nights * (newNumGuests - ubdCount * 0.2)).toFixed(2));
      }
      const { error: bookingErr } = await supabase
        .from("group_bookings").update(updatePayload).eq("id", booking.id);
      if (bookingErr) throw bookingErr;
      return { newNumGuests, newTotalPrice: updatePayload.total_price as number | undefined };
    },
    onSuccess: (result) => {
      if (!booking || !result) return;
      queryClient.setQueryData<GroupBooking[]>(QK.groupBookings(), old =>
        old?.map(b => b.id === booking.id
          ? {
              ...b,
              num_guests: result.newNumGuests,
              ...(result.newTotalPrice != null ? { total_price: result.newTotalPrice } : {}),
            }
          : b
        )
      );
      queryClient.invalidateQueries({ queryKey: QK.groupRoomAssignments(booking.id) });
      queryClient.invalidateQueries({ queryKey: QK.groupBookings() });
      queryClient.invalidateQueries({ queryKey: QK.adminCalendarReservations() });
      toast({ title: t("groupBookings.guestsSaved") });
      callbacks.onGuestsSaved(result);
    },
    onError: (e: Error) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return { updateBookingMutation, saveGuestsMutation };
}
