import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import type { Reservation } from "@/lib/supabase-types";

export function useAdminBanquets() {
  return useQuery({
    queryKey: QK.adminBanquets(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("type", "banquet")
        .not("status", "in", '("DECLINED","CANCELLED")')
        .order("check_in_date", { ascending: true });
      if (error) throw error;
      return data as Reservation[];
    },
  });
}
