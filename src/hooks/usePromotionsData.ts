import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Promotion, PromoApplication } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";

export function useAdminPromotions() {
  return useQuery({
    queryKey: QK.promotionsAdmin(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions").select("*").order("sort_order");
      if (error) throw error;
      return data as Promotion[];
    },
  });
}

export function usePromoApplications() {
  return useQuery({
    queryKey: QK.promoApplications(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as PromoApplication[];
    },
  });
}
