import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Reservation, BookingStatus } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";

interface BookingMutationCallbacks {
  onStatusUpdated?: () => void;
  onDeleted?: () => void;
}

export function useBookingMutations({ onStatusUpdated, onDeleted }: BookingMutationCallbacks = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id, status, notes, currentStatus, depositAmount, payment,
    }: {
      id: string;
      status: BookingStatus;
      notes?: string;
      currentStatus?: BookingStatus;
      depositAmount?: number;
      payment?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const updateData: Record<string, unknown> = { status };
      if (notes !== undefined) updateData.admin_notes = notes;
      if (currentStatus === "UNPROCESSED" && (status === "PENDING" || status === "DECLINED")) {
        updateData.assigned_admin_id = user?.id ?? null;
      }
      if (status === "CONFIRMED") {
        updateData.confirmed_by_admin_id = user?.id ?? null;
        if (depositAmount !== undefined) updateData.deposit_amount = depositAmount;
        if (payment) updateData.payment_method = payment;
      }
      const { error } = await supabase.from("reservations").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminBookings() });
      toast({ title: t("bookings.updated"), description: t("bookings.updatedDesc") });
      onStatusUpdated?.();
    },
    onError: (error: Error) => {
      console.error(error);
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" });
    },
  });

  const deleteCheckinMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminBookings() });
      queryClient.invalidateQueries({ queryKey: QK.adminCalendar() });
      queryClient.invalidateQueries({ queryKey: QK.dashboard() });
      toast({ title: t("bookings.deleted"), description: t("bookings.deletedDesc") });
      onDeleted?.();
    },
    onError: (error: Error) => {
      console.error(error);
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" });
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: BookingStatus }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const updateData: Record<string, unknown> = { status };
      if (status === "CONFIRMED") updateData.confirmed_by_admin_id = user?.id ?? null;
      if (status === "DECLINED" || status === "PENDING") updateData.assigned_admin_id = user?.id ?? null;
      const { error } = await supabase.from("reservations").update(updateData).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminBookings() });
      toast({ title: t("bookings.updated"), description: t("bookings.updatedDesc") });
    },
    onError: (error: Error) => {
      console.error(error);
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" });
    },
  });

  const groupConfirmMutation = useMutation({
    mutationFn: async ({ bookings, totalDeposit, paymentMethod }: {
      bookings: Reservation[];
      totalDeposit: number;
      paymentMethod: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const totalPrice = bookings.reduce((s, b) => s + Number(b.total_price), 0);
      for (const booking of bookings) {
        const ratio = totalPrice > 0 ? Number(booking.total_price) / totalPrice : 1 / bookings.length;
        const depositForRoom = Math.round(totalDeposit * ratio);
        const { error } = await supabase.from("reservations").update({
          status: "CONFIRMED",
          confirmed_by_admin_id: user?.id ?? null,
          deposit_amount: depositForRoom,
          payment_method: paymentMethod,
        } as Record<string, unknown>).eq("id", booking.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminBookings() });
      toast({ title: t("bookings.updated"), description: t("bookings.updatedDesc") });
    },
    onError: (error: Error) => {
      console.error(error);
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" });
    },
  });

  return { updateStatusMutation, deleteCheckinMutation, bulkUpdateStatusMutation, groupConfirmMutation };
}
