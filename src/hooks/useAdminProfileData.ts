import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import type { Reservation } from "@/lib/supabase-types";

export function useAdminProfile() {
  return useQuery({
    queryKey: QK.adminProfile(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return { ...data, userId: user.id, email: user.email };
    },
  });
}

export function useAdminProfileStats(
  userId: string | undefined,
  startIso: string,
  endIso: string,
) {
  return useQuery({
    queryKey: QK.adminProfileStats(userId ?? "", startIso, endIso),
    queryFn: async (): Promise<Reservation[]> => {
      const { data: created, error: e1 } = await supabase
        .from("reservations").select("*")
        .eq("created_by_admin_id", userId!)
        .gte("created_at", startIso).lte("created_at", endIso);
      if (e1) throw e1;

      const { data: confirmed, error: e2 } = await supabase
        .from("reservations").select("*")
        .eq("confirmed_by_admin_id", userId!)
        .gte("updated_at", startIso).lte("updated_at", endIso);
      if (e2) throw e2;

      const { data: assigned, error: e3 } = await supabase
        .from("reservations").select("*")
        .eq("assigned_admin_id", userId!)
        .neq("booking_source", "ADMIN")
        .gte("updated_at", startIso).lte("updated_at", endIso);
      if (e3) throw e3;

      const all = [...(created ?? []), ...(confirmed ?? []), ...(assigned ?? [])];
      return all.filter((b, i, self) => i === self.findIndex(x => x.id === b.id)) as Reservation[];
    },
    enabled: !!userId,
  });
}
