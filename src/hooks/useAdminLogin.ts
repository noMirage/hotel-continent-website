import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface Callbacks {
  onSuccess: (role: string) => void;
}

export function useAdminLogin({ onSuccess }: Callbacks) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles").select("role").eq("user_id", data.user.id)
          .in("role", ["admin", "super_admin", "viewer", "owner"]).maybeSingle();
        if (roleError) throw roleError;
        if (!roleData) {
          await supabase.auth.signOut();
          throw new Error(t("adminLogin.accessDenied"));
        }
        toast({ title: t("adminLogin.welcomeBack"), description: t("adminLogin.loginSuccess") });
        onSuccess(roleData.role);
      }
    } catch (err: any) {
      toast({
        title: t("adminLogin.loginFailed"),
        description: err.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading };
}
