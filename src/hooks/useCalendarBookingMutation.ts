import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { checkFeeConflicts } from "@/lib/booking-conflicts";
import type { BookingStatus } from "@/lib/supabase-types";

export interface UpdateStatusInput {
  reservationId: string;
  currentStatus: BookingStatus;
  status: BookingStatus;
  depositAmount?: number;
  paymentMethod?: string;
}

export interface UpdateDetailsInput {
  reservationId: string;
  originalRoomUnitId: string;
  originalCheckIn: string;
  originalCheckOut: string;
  roomUnitId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  numGuests: number;
  checkIn: Date;
  checkOut: Date;
  specialRequests: string;
  adminNotes: string;
  depositAmount: string;
  earlyCheckinFee: string;
  lateCheckoutFee: string;
  promotionId: string;
  discountPercent: number;
}

export interface DeleteInput {
  reservationId: string;
}

interface Callbacks {
  onStatusSuccess: () => void;
  onDetailsSuccess: () => void;
  onDeleteSuccess: () => void;
}

export function useCalendarBookingMutation({
  onStatusSuccess,
  onDetailsSuccess,
  onDeleteSuccess,
}: Callbacks) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QK.adminBookings() });
    queryClient.invalidateQueries({ queryKey: QK.adminCalendarReservations() });
    queryClient.invalidateQueries({ queryKey: QK.dashboard() });
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (input: UpdateStatusInput) => {
      const { reservationId, currentStatus, status, depositAmount, paymentMethod } = input;
      const { data: { user } } = await supabase.auth.getUser();
      const updateData: Record<string, unknown> = { status };
      if (
        currentStatus === "UNPROCESSED" &&
        (status === "PENDING" || status === "DECLINED")
      ) {
        updateData.assigned_admin_id = user?.id ?? null;
      }
      if (status === "CONFIRMED") {
        updateData.confirmed_by_admin_id = user?.id ?? null;
        if (depositAmount !== undefined) updateData.deposit_amount = depositAmount;
        if (paymentMethod) updateData.payment_method = paymentMethod;
      }
      const { error } = await supabase
        .from("reservations").update(updateData).eq("id", reservationId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); onStatusSuccess(); },
    onError: (e: Error) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const updateDetailsMutation = useMutation({
    mutationFn: async (input: UpdateDetailsInput) => {
      const {
        reservationId, originalRoomUnitId, originalCheckIn, originalCheckOut,
        roomUnitId, guestName, guestEmail, guestPhone, numGuests,
        checkIn, checkOut, specialRequests, adminNotes,
        depositAmount, earlyCheckinFee, lateCheckoutFee, promotionId, discountPercent,
      } = input;

      const effectiveRoomUnitId = roomUnitId || originalRoomUnitId;
      const ciStr = format(checkIn, "yyyy-MM-dd");
      const coStr = format(checkOut, "yyyy-MM-dd");

      if (
        effectiveRoomUnitId !== originalRoomUnitId ||
        ciStr !== originalCheckIn ||
        coStr !== originalCheckOut
      ) {
        const { data: available } = await supabase.rpc("check_room_availability", {
          p_room_unit_id: effectiveRoomUnitId,
          p_check_in: ciStr,
          p_check_out: coStr,
          p_exclude_reservation_id: reservationId,
        });
        if (!available) throw new Error(t("calendar.notAvailable"));
      }

      const newEarlyFee = parseFloat(earlyCheckinFee) || 0;
      const newLateFee  = parseFloat(lateCheckoutFee) || 0;
      if (newEarlyFee > 0 || newLateFee > 0) {
        const { earlyConflict, lateConflict } = await checkFeeConflicts(
          effectiveRoomUnitId, ciStr, coStr,
          newEarlyFee, newLateFee, reservationId,
        );
        if (earlyConflict) throw new Error(t("common.earlyCheckinConflict"));
        if (lateConflict)  throw new Error(t("common.lateCheckoutConflict"));
      }

      const depositNum = parseFloat(depositAmount);
      const { error } = await supabase.from("reservations").update({
        room_unit_id: effectiveRoomUnitId,
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim(),
        guest_phone: guestPhone.trim() || null,
        num_guests: numGuests,
        check_in_date: ciStr,
        check_out_date: coStr,
        special_requests: specialRequests.trim() || null,
        admin_notes: adminNotes.trim() || null,
        deposit_amount: depositAmount.trim() !== "" && !isNaN(depositNum) ? depositNum : null,
        early_checkin_fee: newEarlyFee,
        late_checkout_fee: newLateFee,
        promotion_id: promotionId || null,
        discount_percent: discountPercent,
      } as Record<string, unknown>).eq("id", reservationId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: t("bookings.updated"), description: t("bookings.updatedDesc") });
      onDetailsSuccess();
    },
    onError: (e: Error) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (input: DeleteInput) => {
      const { error } = await supabase
        .from("reservations").delete().eq("id", input.reservationId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: t("bookings.deleted"), description: t("bookings.deletedDesc") });
      onDeleteSuccess();
    },
    onError: (e: Error) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return { updateStatusMutation, updateDetailsMutation, deleteMutation };
}
