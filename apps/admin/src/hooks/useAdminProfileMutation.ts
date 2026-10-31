import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface Callbacks {
  onUpdateSuccess: () => void;
}

export function useAdminProfileMutation({ onUpdateSuccess }: Callbacks) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").upsert(
        { user_id: user.id, full_name: name.trim() },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.adminProfile() });
      queryClient.invalidateQueries({ queryKey: QK.currentUserProfile() });
      toast({ title: t("profile.nameSaved") });
      onUpdateSuccess();
    },
    onError: (e: Error) =>
      toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });
}
