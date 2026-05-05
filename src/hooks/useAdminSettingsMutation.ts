import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

export interface SaveSettingsInput {
  formData: {
    hotel_name: string; hotel_tagline: string; hotel_description: string;
    email: string; phone: string; address: string; address_uk: string;
    check_in_time: string; check_out_time: string; currency: string;
    tourist_tax_rate: string; extra_capacity: string;
  };
  autoCapacity: number;
  settingsId: string | null;
}

export function useAdminSettingsMutation() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ formData, autoCapacity, settingsId }: SaveSettingsInput) => {
      const extra = parseInt(formData.extra_capacity) || 0;
      const payload = {
        hotel_name:        formData.hotel_name,
        hotel_tagline:     formData.hotel_tagline,
        hotel_description: formData.hotel_description,
        email:             formData.email,
        phone:             formData.phone,
        address:           formData.address,
        address_uk:        formData.address_uk,
        check_in_time:     formData.check_in_time,
        check_out_time:    formData.check_out_time,
        currency:          formData.currency,
        tourist_tax_rate:  parseFloat(formData.tourist_tax_rate) || 41.5,
        extra_capacity:    extra,
        total_capacity:    autoCapacity + extra,
      };

      if (settingsId) {
        const { error } = await supabase.from("hotel_settings").update(payload).eq("id", settingsId);
        if (error) {
          if (error.message?.includes("extra_capacity")) {
            const { extra_capacity: _omit, ...fallbackPayload } = payload;
            const { error: err2 } = await supabase.from("hotel_settings").update(fallbackPayload).eq("id", settingsId);
            if (err2) throw err2;
          } else {
            throw error;
          }
        }
      } else {
        const { error } = await supabase.from("hotel_settings").insert(payload);
        if (error) {
          if (error.message?.includes("extra_capacity")) {
            const { extra_capacity: _omit, ...fallbackPayload } = payload;
            const { error: err2 } = await supabase.from("hotel_settings").insert(fallbackPayload);
            if (err2) throw err2;
          } else {
            throw error;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminHotelSettings() });
      queryClient.invalidateQueries({ queryKey: QK.hotelSettings() });
      toast({ title: t("settings.saved"), description: t("settings.savedDesc") });
    },
    onError: (error: Error) => {
      console.error(error);
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" });
    },
  });
}
