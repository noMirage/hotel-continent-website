import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";

export function useBookingAdminProfile(assignedAdminId: string | undefined) {
  return useQuery({
    queryKey: QK.profile(assignedAdminId),
    queryFn: async () => {
      if (!assignedAdminId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", assignedAdminId)
        .maybeSingle();
      return data as { full_name: string | null } | null;
    },
    enabled: !!assignedAdminId,
  });
}
