import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";
import { DEFAULT_COMMISSION_RATE } from "@/lib/constants";

interface UserRole {
  role: AppRole;
  user_id: string;
}

export type { AppRole };

export function useUserRole() {
  return useQuery({
    queryKey: QK.userRole(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserRole | null;
    },
  });
}

export function useIsSuperAdmin() {
  const { data: roleData, isLoading } = useUserRole();
  return {
    isSuperAdmin: roleData?.role === "super_admin",
    isLoading,
  };
}

export function useIsAdmin() {
  const { data: roleData, isLoading } = useUserRole();
  return {
    isAdmin: roleData?.role === "admin" || roleData?.role === "super_admin",
    isLoading,
  };
}

export function useIsViewer() {
  const { data: roleData, isLoading } = useUserRole();
  return {
    isViewer: roleData?.role === "viewer",
    isLoading,
  };
}

export function useIsOwner() {
  const { data: roleData, isLoading } = useUserRole();
  return {
    isOwner: roleData?.role === "owner",
    isLoading,
  };
}

/** Returns current user's profile (full_name, email, role) */
export function useCurrentUserProfile() {
  return useQuery({
    queryKey: QK.currentUserProfile(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, commission_rate")
        .eq("user_id", user.id)
        .maybeSingle();
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      return {
        fullName: profile?.full_name ?? null,
        email: user.email ?? null,
        role: (roleRow?.role ?? "admin") as AppRole,
        commissionRate: profile?.commission_rate ?? DEFAULT_COMMISSION_RATE,
      };
    },
    staleTime: 60 * 1000,
  });
}
