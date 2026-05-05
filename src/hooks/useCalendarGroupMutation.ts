import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { getConflictingRooms } from "@/lib/booking-conflicts";
import { getEffectivePrice } from "@/lib/room-pricing";
import type { RoomUnit, RoomTypeGuestPrice, BookingStatus } from "@/lib/supabase-types";

type RoomUnitWithType = RoomUnit & {
  room_type: { name: string; name_uk?: string | null; base_price: number; max_guests: number };
};

export interface CreateStdBookingInput {
  checkIn: Date;
  checkOut: Date;
  selectedRooms: RoomUnitWithType[];
  allRoomUnits: RoomUnitWithType[];
  allGuestPrices: RoomTypeGuestPrice[];
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  numGuests: number;
  ttRate: number;
  discountMultiplier: number;
  discountPercent: number;
  promotionId: string | null;
  status: BookingStatus;
  specialRequests: string;
  adminNotes: string;
}

export interface CreateGroupBookingInput {
  checkIn: Date;
  checkOut: Date;
  roomUnitIds: string[];
  allRoomUnits: RoomUnitWithType[];
  bookingName: string;
  contactPerson: string;
  phone: string;
  numGuests: number;
  selectedCalcId: string;
  customPricePerPersonNight: string;
  finalGroupTotal: number;
  customCalcTotal: number;
  status: string;
  adminNotes: string;
  depositAmount: string;
}

interface Callbacks {
  onStdSuccess: () => void;
  onGroupSuccess: () => void;
}

export function useCalendarGroupMutation({ onStdSuccess, onGroupSuccess }: Callbacks) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createStdMutation = useMutation({
    mutationFn: async (input: CreateStdBookingInput) => {
      const {
        checkIn, checkOut, selectedRooms, allRoomUnits, allGuestPrices,
        guestName, guestEmail, guestPhone, numGuests, ttRate,
        discountMultiplier, discountPercent, promotionId, status, specialRequests, adminNotes,
      } = input;

      const ciStr = format(checkIn, "yyyy-MM-dd");
      const coStr = format(checkOut, "yyyy-MM-dd");
      const nights = differenceInDays(checkOut, checkIn);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles").select("commission_rate").eq("user_id", user.id).maybeSingle();
      const commissionRate = (profile as any)?.commission_rate || 3.0;

      const roomIds = selectedRooms.map(u => u.id);
      const conflicts = await getConflictingRooms(roomIds, ciStr, coStr);
      if (conflicts.length > 0) {
        const labels = conflicts.map(id => allRoomUnits.find(r => r.id === id)?.room_number ?? id);
        throw new Error(t("common.roomConflict", { rooms: labels.join(", ") }));
      }

      const numRooms     = selectedRooms.length;
      const guestsBase   = Math.floor(numGuests / numRooms);
      const guestsRem    = numGuests % numRooms;
      const groupId      = numRooms > 1 ? crypto.randomUUID() : null;

      const rows = selectedRooms.map((u, i) => {
        const roomGuests      = guestsBase + (i < guestsRem ? 1 : 0);
        const roomTax         = ttRate * roomGuests * nights;
        const roomGuestPrices = allGuestPrices.filter(p => p.room_type_id === u.room_type_id);
        const roomRate        = getEffectivePrice(roomGuestPrices, roomGuests, u.room_type.base_price);
        const baseRoomPrice   = roomRate * nights;
        return {
          guest_name: guestName, guest_email: guestEmail || null, guest_phone: guestPhone || null,
          check_in_date: ciStr, check_out_date: coStr,
          num_guests: roomGuests, room_unit_id: u.id,
          total_price: baseRoomPrice * discountMultiplier,
          tourist_tax_amount: roomTax, status,
          special_requests: specialRequests || null, admin_notes: adminNotes || null,
          booking_source: "ADMIN", created_by_admin_id: user.id,
          confirmed_by_admin_id: status === "CONFIRMED" ? user.id : null,
          commission_rate: commissionRate,
          booking_group_id: groupId,
          promotion_id: promotionId || null,
          discount_percent: discountPercent,
        };
      });

      const { error } = await supabase.from("reservations").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminBookings() });
      queryClient.invalidateQueries({ queryKey: QK.adminCalendarReservations() });
      toast({ title: t("manualBooking.created"), description: t("manualBooking.createdDesc") });
      onStdSuccess();
    },
    onError: (e: Error) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const createGroupMutation = useMutation({
    mutationFn: async (input: CreateGroupBookingInput): Promise<{ wasCustomCalc: boolean }> => {
      const {
        checkIn, checkOut, roomUnitIds, allRoomUnits, bookingName, contactPerson, phone,
        numGuests, selectedCalcId, customPricePerPersonNight, finalGroupTotal, customCalcTotal,
        status, adminNotes, depositAmount,
      } = input;

      const ciStr = format(checkIn, "yyyy-MM-dd");
      const coStr = format(checkOut, "yyyy-MM-dd");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const conflicts = await getConflictingRooms(roomUnitIds, ciStr, coStr);
      if (conflicts.length > 0) {
        const labels = conflicts.map(id => allRoomUnits.find(r => r.id === id)?.room_number ?? id);
        throw new Error(t("common.roomConflict", { rooms: labels.join(", ") }));
      }

      let calcId: string | null = selectedCalcId === "none" || selectedCalcId === "custom" ? null : selectedCalcId;
      let totalPrice = finalGroupTotal;

      if (selectedCalcId === "custom" && customPricePerPersonNight) {
        const pricePerPersonNight = parseFloat(customPricePerPersonNight);
        const { data: newCalc, error: calcErr } = await supabase
          .from("group_calculations")
          .insert({ name: `Custom — ${bookingName}`, price_per_person_per_night: pricePerPersonNight, created_by_admin_id: user.id })
          .select().single();
        if (calcErr) throw calcErr;
        calcId = newCalc.id;
        totalPrice = customCalcTotal;
        queryClient.invalidateQueries({ queryKey: QK.groupCalculations() });
      }

      const depositNum = depositAmount ? parseFloat(depositAmount) : null;
      const insertPayload = {
        booking_name: bookingName, contact_person: contactPerson, phone: phone || null,
        num_guests: numGuests, room_unit_ids: roomUnitIds,
        check_in_date: ciStr, check_out_date: coStr,
        status, admin_notes: adminNotes || null,
        calculation_id: calcId,
        custom_total: selectedCalcId === "custom" ? customCalcTotal : null,
        total_price: totalPrice, created_by_admin_id: user.id,
        deposit_amount: depositNum,
      };

      let insertResult = await supabase.from("group_bookings").insert(insertPayload).select().single();
      if (insertResult.error?.message?.includes("deposit_amount")) {
        const { deposit_amount: _omit, ...fallback } = insertPayload;
        insertResult = await supabase.from("group_bookings").insert(fallback).select().single();
      }
      if (insertResult.error) throw insertResult.error;
      const newBooking = insertResult.data;

      const assignmentRows = roomUnitIds.map(roomId => {
        const room  = allRoomUnits.find(u => u.id === roomId);
        const slots = room?.room_type?.max_guests ?? 2;
        return {
          group_booking_id: newBooking.id,
          room_unit_id: roomId,
          guest_names: Array<string>(slots).fill(""),
          early_checkin_fee: 0,
          late_checkout_fee: 0,
        };
      });
      if (assignmentRows.length > 0) {
        await supabase.from("group_booking_room_assignments").insert(assignmentRows);
      }

      return { wasCustomCalc: selectedCalcId === "custom" };
    },
    onSuccess: ({ wasCustomCalc }) => {
      queryClient.invalidateQueries({ queryKey: QK.adminCalendarGroupBookings() });
      queryClient.invalidateQueries({ queryKey: QK.groupBookings() });
      queryClient.invalidateQueries({ queryKey: QK.groupRoomAssignments() });
      toast({ title: t("groupBookings.created") });
      if (wasCustomCalc) toast({ description: t("groupBookings.customSavedToCalc") });
      onGroupSuccess();
    },
    onError: (e: Error) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return { createStdMutation, createGroupMutation };
}
