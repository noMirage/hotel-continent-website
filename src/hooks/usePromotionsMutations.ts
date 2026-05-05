import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import type { PromoApplicationStatus } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";

interface Callbacks {
  onSaveSuccess: () => void;
  onDeleteSuccess: () => void;
  onAppUpdated: () => void;
}

export function usePromotionsMutations(callbacks: Callbacks) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const lang = language as "en" | "uk";

  const invalidatePromos = () => {
    qc.invalidateQueries({ queryKey: QK.promotionsAdmin() });
    qc.invalidateQueries({ queryKey: QK.activePromotions() });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown> & { id?: string }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase
          .from("promotions")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id as string);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promotions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidatePromos();
      toast({ title: lang === "uk" ? "Збережено" : "Saved" });
      callbacks.onSaveSuccess();
    },
    onError: () => toast({ title: lang === "uk" ? "Помилка збереження" : "Save failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidatePromos();
      toast({ title: lang === "uk" ? "Видалено" : "Deleted" });
      callbacks.onDeleteSuccess();
    },
    onError: () => toast({ title: lang === "uk" ? "Помилка видалення" : "Delete failed", variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("promotions")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidatePromos,
  });

  const updateAppMutation = useMutation({
    mutationFn: async ({ id, status, admin_feedback }: { id: string; status: PromoApplicationStatus; admin_feedback: string }) => {
      const { error } = await supabase
        .from("promo_applications")
        .update({ status, admin_feedback: admin_feedback || null, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.promoApplications() });
      toast({ title: lang === "uk" ? "Заявку оновлено" : "Application updated" });
      callbacks.onAppUpdated();
    },
    onError: () => {
      toast({ title: lang === "uk" ? "Помилка" : "Error", variant: "destructive" });
      callbacks.onAppUpdated();
    },
  });

  return { saveMutation, deleteMutation, toggleActiveMutation, updateAppMutation };
}
