import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

export interface RoomUnitFormState {
  room_type_id: string;
  room_number: string;
  floor: string;
  notes: string;
  is_active: boolean;
  bed_config: string;
  extra_accommodation_enabled: boolean;
  extra_accommodation_max: string;
}

export interface SaveRoomUnitInput {
  form: RoomUnitFormState;
  editingUnitId: string | null;
}

interface Callbacks {
  onSaveSuccess: () => void;
  onDeleteSuccess: () => void;
  onDeactivateSuccess: () => void;
}

export function useRoomUnitsMutations({
  onSaveSuccess,
  onDeleteSuccess,
  onDeactivateSuccess,
}: Callbacks) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QK.roomManagerUnits() });
    queryClient.invalidateQueries({ queryKey: QK.adminCalendarRooms() });
  };

  const saveMutation = useMutation({
    mutationFn: async (input: SaveRoomUnitInput): Promise<{ wasEdit: boolean }> => {
      const { form: f, editingUnitId } = input;
      const payload = {
        room_type_id: f.room_type_id,
        room_number: f.room_number.trim(),
        floor: f.floor ? parseInt(f.floor) : null,
        notes: f.notes.trim() || null,
        is_active: f.is_active,
        bed_config: f.bed_config === "none" ? null : f.bed_config || null,
        extra_accommodation_enabled: f.extra_accommodation_enabled,
        extra_accommodation_max: f.extra_accommodation_enabled
          ? (parseInt(f.extra_accommodation_max) || 0)
          : 0,
      };
      if (editingUnitId) {
        const { error } = await supabase.from("room_units").update(payload).eq("id", editingUnitId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("room_units").insert(payload);
        if (error) throw error;
      }
      return { wasEdit: !!editingUnitId };
    },
    onSuccess: ({ wasEdit }) => {
      invalidate();
      toast({ title: wasEdit ? t("roomManager.updated") : t("roomManager.created") });
      onSaveSuccess();
    },
    onError: (e: Error) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("room_unit_id", id);
      if ((count ?? 0) > 0) {
        throw new Error(t("roomManager.deleteHasReservations"));
      }
      const { error } = await supabase.from("room_units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: t("roomManager.deleted") });
      onDeleteSuccess();
    },
    onError: (e: Error) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("room_units").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: t("roomManager.deactivated") });
      onDeactivateSuccess();
    },
    onError: (e: Error) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  return { saveMutation, deleteMutation, deactivateMutation };
}
