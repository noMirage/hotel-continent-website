import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

export interface SaveRoomInput {
  formData: {
    name: string; slug: string; description: string; short_description: string;
    name_uk: string; description_uk: string; short_description_uk: string; amenities_uk: string;
    base_price: string; max_guests: string; size_sqm: string; bed_type: string;
    amenities: string; is_active: boolean;
  };
  editingRoomId: string | null;
  guestPriceDraft: { guest_count: string; price_per_night: string }[];
}

interface Callbacks {
  onSaveSuccess: () => void;
}

export function useAdminRoomsMutations({ onSaveSuccess }: Callbacks) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async ({ formData, editingRoomId, guestPriceDraft }: SaveRoomInput) => {
      const roomData = {
        name:                  formData.name,
        slug:                  formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
        description:           formData.description,
        short_description:     formData.short_description,
        base_price:            parseFloat(formData.base_price),
        max_guests:            parseInt(formData.max_guests),
        size_sqm:              formData.size_sqm ? parseInt(formData.size_sqm) : null,
        bed_type:              formData.bed_type || null,
        amenities:             formData.amenities.split(",").map(a => a.trim()).filter(Boolean),
        name_uk:               formData.name_uk || null,
        description_uk:        formData.description_uk || null,
        short_description_uk:  formData.short_description_uk || null,
        amenities_uk:          formData.amenities_uk
          ? formData.amenities_uk.split(",").map(a => a.trim()).filter(Boolean)
          : [],
        is_active:             formData.is_active,
      };

      let roomTypeId: string;
      if (editingRoomId) {
        const { error } = await supabase.from("room_types").update(roomData).eq("id", editingRoomId);
        if (error) throw error;
        roomTypeId = editingRoomId;
      } else {
        const { data: inserted, error } = await supabase
          .from("room_types").insert(roomData).select("id").single();
        if (error) throw error;
        roomTypeId = inserted.id;
      }

      await supabase.from("room_type_guest_prices").delete().eq("room_type_id", roomTypeId);
      const validPrices = guestPriceDraft
        .filter(p => p.guest_count && p.price_per_night)
        .map(p => ({
          room_type_id:    roomTypeId,
          guest_count:     parseInt(p.guest_count),
          price_per_night: parseFloat(p.price_per_night),
        }));
      if (validPrices.length > 0) {
        const { error: gpErr } = await supabase.from("room_type_guest_prices").insert(validPrices);
        if (gpErr) throw gpErr;
      }

      return { wasEdit: !!editingRoomId };
    },
    onSuccess: ({ wasEdit }) => {
      queryClient.invalidateQueries({ queryKey: QK.adminRoomTypes() });
      queryClient.invalidateQueries({ queryKey: QK.roomTypes() });
      queryClient.invalidateQueries({ queryKey: QK.roomTypeGuestPrices() });
      queryClient.invalidateQueries({ queryKey: QK.allRoomTypeGuestPrices() });
      toast({
        title: wasEdit ? t("adminRooms.roomUpdated") : t("adminRooms.roomCreated"),
        description: t("adminRooms.roomSaved"),
      });
      onSaveSuccess();
    },
    onError: (error: Error) => {
      console.error(error);
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("room_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminRoomTypes() });
      queryClient.invalidateQueries({ queryKey: QK.roomTypes() });
      toast({ title: t("adminRooms.roomDeleted"), description: t("adminRooms.roomRemoved") });
    },
    onError: (error: Error) => {
      console.error(error);
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" });
    },
  });

  return { saveMutation, deleteMutation };
}
