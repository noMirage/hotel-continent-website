import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import type { GroupBookingRequestStatus } from "@/lib/supabase-types";

interface Callbacks {
  onDeleteBookingSuccess: () => void;
  onDeleteCalcSuccess: () => void;
  onRequestUpdated: () => void;
}

export function useGroupBookingsMutations({
  onDeleteBookingSuccess,
  onDeleteCalcSuccess,
  onRequestUpdated,
}: Callbacks) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.groupBookings() });
      toast({ title: t("groupBookings.deleted") });
      onDeleteBookingSuccess();
    },
    onError: (e: Error) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const deleteCalcMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_calculations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.groupCalculations() });
      toast({ title: t("calculations.deleted") });
      onDeleteCalcSuccess();
    },
    onError: (e: Error) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("group_bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.groupBookings() });
      queryClient.invalidateQueries({ queryKey: QK.adminGroupStats() });
    },
    onError: (e: Error) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: GroupBookingRequestStatus; admin_notes: string }) => {
      const { error } = await supabase
        .from("group_booking_requests")
        .update({ status, admin_notes: admin_notes || null, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.groupBookingRequests() });
      toast({ title: t("groupBookings.requestSaved") });
      onRequestUpdated();
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
      onRequestUpdated();
    },
  });

  return { deleteBookingMutation, deleteCalcMutation, statusMutation, updateRequestMutation };
}
