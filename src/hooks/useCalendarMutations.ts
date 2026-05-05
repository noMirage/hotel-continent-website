import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

type CleanlinessStatus = "clean" | "dirty" | "under_renovation";

interface Callbacks {
  onCleanlinessUpdated: () => void;
}

export function useCalendarMutations({ onCleanlinessUpdated }: Callbacks) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateCleanlinessMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CleanlinessStatus }) => {
      const { error } = await supabase.from("room_units").update({ cleanliness_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminCalendarRooms() });
      toast({ title: t("calendar.cleanlinessUpdated") });
      onCleanlinessUpdated();
    },
    onError: (e: Error) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const moveMutation = useMutation({
    mutationFn: async ({
      reservationId, newCheckIn, newCheckOut, newRoomUnitId,
    }: { reservationId: string; newCheckIn: string; newCheckOut: string; newRoomUnitId: string }) => {
      const { data: available } = await supabase.rpc("check_room_availability", {
        p_room_unit_id: newRoomUnitId,
        p_check_in: newCheckIn,
        p_check_out: newCheckOut,
        p_exclude_reservation_id: reservationId,
      });
      if (!available) throw new Error(t("calendar.notAvailable"));
      const { error } = await supabase.from("reservations").update({
        check_in_date: newCheckIn,
        check_out_date: newCheckOut,
        room_unit_id: newRoomUnitId,
      }).eq("id", reservationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminCalendarReservations() });
      queryClient.invalidateQueries({ queryKey: QK.adminCalendarGroupBookings() });
      queryClient.invalidateQueries({ queryKey: QK.adminBookings() });
      toast({ title: t("calendar.moved"), description: t("calendar.movedDesc") });
    },
    onError: (e: Error) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return { updateCleanlinessMutation, moveMutation };
}
