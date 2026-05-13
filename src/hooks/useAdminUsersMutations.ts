import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

type AppRole = "admin" | "super_admin" | "viewer" | "owner" | "user";

interface Callbacks {
  onAddSuccess: () => void;
  onUpdateCommissionSuccess: () => void;
  onDeleteSuccess: () => void;
}

export function useAdminUsersMutations({
  onAddSuccess,
  onUpdateCommissionSuccess,
  onDeleteSuccess,
}: Callbacks) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addAdminMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      const { data, error } = await supabase.rpc("grant_admin_role", {
        p_email: email,
        p_role: role,
      });
      if (error) throw error;
      return { result: data as string, email, role };
    },
    onSuccess: ({ result, email, role }) => {
      if (result === "SUCCESS") {
        queryClient.invalidateQueries({ queryKey: QK.adminUsers() });
        toast({
          title: t("users.addSuccess"),
          description: t("users.addSuccessDesc", { email, role }),
        });
        onAddSuccess();
      } else if (result === "USER_NOT_FOUND") {
        toast({
          title: t("users.userNotFound"),
          description: t("users.userNotFoundDesc", { email }),
          variant: "destructive",
        });
      } else {
        toast({ title: t("users.permissionDenied"), description: result, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV) console.error(error);
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Use the SECURITY DEFINER RPC so the caller's permission is enforced
      // server-side. The direct .update() path bypasses that check and silently
      // fails for super_admin callers (whose RLS only covers owner).
      const { data, error } = await supabase.rpc("update_role_by_user_id", {
        p_user_id: userId,
        p_role: role,
      });
      if (error) throw error;
      if (data !== "SUCCESS") throw new Error(data as string);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QK.adminUsers() }); },
    onError: () => { toast({ title: t("common.error"), description: "Failed to update role.", variant: "destructive" }); },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ userId, rate, rateManual, rateSite, fullName }: {
      userId: string; rate: number; rateManual: number; rateSite: number; fullName: string;
    }) => {
      const { error } = await supabase.from("profiles").update({
        commission_rate: rate,
        commission_rate_manual: rateManual,
        commission_rate_site: rateSite,
        full_name: fullName || null,
      }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminUsers() });
      onUpdateCommissionSuccess();
    },
    onError: () => { toast({ title: t("common.error"), description: "Failed to update profile.", variant: "destructive" }); },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminUsers() });
      onDeleteSuccess();
    },
    onError: () => { toast({ title: t("common.error"), description: "Failed to remove admin.", variant: "destructive" }); },
  });

  return { addAdminMutation, updateRoleMutation, updateCommissionMutation, deleteRoleMutation };
}
