import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";

type AppRole = "admin" | "super_admin" | "viewer" | "owner" | "user";

export interface AdminUser {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profile: {
    full_name: string | null;
    commission_rate: number | null;
    commission_rate_manual: number | null;
    commission_rate_site: number | null;
  } | null;
  email?: string;
}

export function useCurrentUserId() {
  return useQuery({
    queryKey: QK.currentUserId(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
  });
}

export function useAdminUsersList(enabled: boolean) {
  return useQuery({
    queryKey: QK.adminUsers(),
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, created_at")
        .in("role", ["admin", "super_admin", "viewer", "owner"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, commission_rate, commission_rate_manual, commission_rate_site")
        .in("user_id", userIds);
      return roles.map(role => ({
        ...role,
        profile: profiles?.find(p => p.user_id === role.user_id) ?? null,
      })) as AdminUser[];
    },
    enabled,
  });
}
