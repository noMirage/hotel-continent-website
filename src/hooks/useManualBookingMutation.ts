import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { getConflictingRooms } from "@/lib/booking-conflicts";
import type { BookingStatus } from "@/lib/supabase-types";

export interface CreateManualBookingInput {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: Date;
  checkOutDate: Date;
  numGuests: number;
  roomUnitId: string;
  totalPrice: number;
  ttRate: number;
  status: BookingStatus;
  specialRequests: string;
  adminNotes: string;
}

interface Callbacks {
  onBookingCreated: () => void;
}

export function useManualBookingMutation({ onBookingCreated }: Callbacks) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createBookingMutation = useMutation({
    mutationFn: async (input: CreateManualBookingInput) => {
      const {
        guestName, guestEmail, guestPhone, checkInDate, checkOutDate,
        numGuests, roomUnitId, totalPrice, ttRate, status, specialRequests, adminNotes,
      } = input;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles").select("commission_rate").eq("user_id", user.id).maybeSingle();
      const commissionRate = profile?.commission_rate || 3.0;

      const ciStr = format(checkInDate, "yyyy-MM-dd");
      const coStr = format(checkOutDate, "yyyy-MM-dd");
      const nights = differenceInDays(checkOutDate, checkInDate);

      const conflicts = await getConflictingRooms([roomUnitId], ciStr, coStr);
      if (conflicts.length > 0) {
        throw new Error(t("common.roomConflict", { rooms: roomUnitId }));
      }

      const ttAmt = ttRate * numGuests * nights;
      const { error } = await supabase.from("reservations").insert({
        guest_name: guestName,
        guest_email: guestEmail || null,
        guest_phone: guestPhone || null,
        check_in_date: ciStr,
        check_out_date: coStr,
        num_guests: numGuests,
        room_unit_id: roomUnitId,
        total_price: totalPrice,
        tourist_tax_amount: ttAmt,
        status,
        special_requests: specialRequests || null,
        admin_notes: adminNotes || null,
        booking_source: "ADMIN",
        created_by_admin_id: user.id,
        confirmed_by_admin_id: status === "CONFIRMED" ? user.id : null,
        commission_rate: commissionRate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminBookings() });
      queryClient.invalidateQueries({ queryKey: QK.adminStats() });
      queryClient.invalidateQueries({ queryKey: QK.adminCalendarReservations() });
      toast({ title: t("manualBooking.created"), description: t("manualBooking.createdDesc") });
      onBookingCreated();
    },
    onError: (e: Error) => {
      console.error(e);
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" });
    },
  });

  return { createBookingMutation };
}
