import { useState, useEffect } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import type { GroupCalculation } from "@/lib/supabase-types";

interface ServiceRow { id?: string; service_name: string; cost: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCalc?: GroupCalculation | null;
}

export function CalculationDialog({ open, onOpenChange, editCalc }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name,     setName]     = useState("");
  const [price,    setPrice]    = useState("");
  const [services, setServices] = useState<ServiceRow[]>([]);

  useEffect(() => {
    if (open) {
      setName(editCalc?.name ?? "");
      setPrice(String(editCalc?.price_per_person_per_night ?? ""));
      setServices(
        editCalc?.services?.map(s => ({
          id: s.id,
          service_name: s.service_name,
          cost: s.cost != null ? String(s.cost) : "",
        })) ?? []
      );
    }
  }, [open, editCalc]);

  function addService() { setServices(prev => [...prev, { service_name: "", cost: "" }]); }
  function removeService(idx: number) { setServices(prev => prev.filter((_, i) => i !== idx)); }
  function updateService(idx: number, field: keyof ServiceRow, val: string) {
    setServices(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editCalc) {
        const { error } = await supabase.from("group_calculations")
          .update({ name, price_per_person_per_night: parseFloat(price) })
          .eq("id", editCalc.id);
        if (error) throw error;

        await supabase.from("group_calculation_services").delete().eq("calculation_id", editCalc.id);
        const toInsert = services.filter(s => s.service_name).map(s => ({
          calculation_id: editCalc.id,
          service_name: s.service_name,
          cost: s.cost ? parseFloat(s.cost) : null,
        }));
        if (toInsert.length > 0) {
          const { error: svcErr } = await supabase.from("group_calculation_services").insert(toInsert);
          if (svcErr) throw svcErr;
        }
      } else {
        const { data: calc, error } = await supabase.from("group_calculations")
          .insert({ name, price_per_person_per_night: parseFloat(price), created_by_admin_id: user.id })
          .select().single();
        if (error) throw error;

        const toInsert = services.filter(s => s.service_name).map(s => ({
          calculation_id: calc.id,
          service_name: s.service_name,
          cost: s.cost ? parseFloat(s.cost) : null,
        }));
        if (toInsert.length > 0) {
          const { error: svcErr } = await supabase.from("group_calculation_services").insert(toInsert);
          if (svcErr) throw svcErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.groupCalculations() });
      toast({ title: editCalc ? t("calculations.updated") : t("calculations.created") });
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const isValid = !!(name && price && parseFloat(price) >= 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editCalc ? t("calculations.edit") : t("calculations.add")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("calculations.name")} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("calculations.price")} *</Label>
            <Input type="number" min={0} step={0.01} value={price} onChange={e => setPrice(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("calculations.services")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addService}>
                <Plus className="h-3.5 w-3.5 mr-1" />{t("calculations.addService")}
              </Button>
            </div>
            {services.map((svc, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  placeholder={t("calculations.serviceName")}
                  value={svc.service_name}
                  onChange={e => updateService(idx, "service_name", e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder={t("calculations.serviceCost")}
                  type="number"
                  min={0}
                  value={svc.cost}
                  onChange={e => updateService(idx, "cost", e.target.value)}
                  className="w-32"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeService(idx)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("calculations.cancel")}</Button>
          <Button disabled={!isValid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("calculations.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
