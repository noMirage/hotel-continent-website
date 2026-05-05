import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { Promotion } from "@/lib/supabase-types";

interface PromoFormState {
  title: string;
  title_uk: string;
  description: string;
  description_uk: string;
  badge: string;
  badge_uk: string;
  highlights: string;
  highlights_uk: string;
  discount_percent: string;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  sort_order: string;
}

function emptyForm(): PromoFormState {
  return {
    title: "", title_uk: "", description: "", description_uk: "",
    badge: "", badge_uk: "", highlights: "", highlights_uk: "",
    discount_percent: "0",
    valid_from: "", valid_to: "", is_active: true, sort_order: "0",
  };
}

function promoToForm(p: Promotion): PromoFormState {
  return {
    title:            p.title,
    title_uk:         p.title_uk ?? "",
    description:      p.description ?? "",
    description_uk:   p.description_uk ?? "",
    badge:            p.badge ?? "",
    badge_uk:         p.badge_uk ?? "",
    highlights:       p.highlights.join("\n"),
    highlights_uk:    p.highlights_uk.join("\n"),
    discount_percent: String(p.discount_percent ?? 0),
    valid_from:       p.valid_from ?? "",
    valid_to:         p.valid_to ?? "",
    is_active:        p.is_active,
    sort_order:       String(p.sort_order),
  };
}

function formToPayload(f: PromoFormState) {
  return {
    title:            f.title.trim(),
    title_uk:         f.title_uk.trim() || null,
    description:      f.description.trim() || null,
    description_uk:   f.description_uk.trim() || null,
    badge:            f.badge.trim() || null,
    badge_uk:         f.badge_uk.trim() || null,
    highlights:       f.highlights.split("\n").map(s => s.trim()).filter(Boolean),
    highlights_uk:    f.highlights_uk.split("\n").map(s => s.trim()).filter(Boolean),
    discount_percent: Math.max(0, Math.min(100, parseFloat(f.discount_percent) || 0)),
    valid_from:       f.valid_from || null,
    valid_to:         f.valid_to || null,
    is_active:        f.is_active,
    sort_order:       parseInt(f.sort_order) || 0,
  };
}

interface Props {
  open: boolean;
  editing: Promotion | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveMutation: any;
  onClose: () => void;
  lang: "en" | "uk";
}

export function PromotionFormDialog({ open, editing, saveMutation, onClose, lang }: Props) {
  const [formState, setFormState] = useState<PromoFormState>(emptyForm());

  useEffect(() => {
    setFormState(editing ? promoToForm(editing) : emptyForm());
  }, [editing]);

  const field = (key: keyof PromoFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormState(p => ({ ...p, [key]: e.target.value }));

  function handleSave() {
    if (!formState.title.trim()) return;
    const payload = formToPayload(formState);
    saveMutation.mutate(editing ? { ...payload, id: editing.id } : payload);
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? (lang === "uk" ? "Редагувати акцію" : "Edit Promotion")
              : (lang === "uk" ? "Нова акція"       : "New Promotion")}
          </DialogTitle>
          <DialogDescription>
            {lang === "uk"
              ? "Заповніть поля. Текст можна ввести двома мовами."
              : "Fill in the fields. Text can be entered in both languages."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>{lang === "uk" ? "Назва (EN)" : "Title (EN)"} *</Label>
            <Input value={formState.title} onChange={field("title")} placeholder="Summer Special" />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "uk" ? "Назва (UK)" : "Title (UK)"}</Label>
            <Input value={formState.title_uk} onChange={field("title_uk")} placeholder="Літня пропозиція" />
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "uk" ? "Мітка (EN)" : "Badge (EN)"}</Label>
            <Input value={formState.badge} onChange={field("badge")} placeholder="Special Offer" />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "uk" ? "Мітка (UK)" : "Badge (UK)"}</Label>
            <Input value={formState.badge_uk} onChange={field("badge_uk")} placeholder="Спеціальна пропозиція" />
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "uk" ? "Опис (EN)" : "Description (EN)"}</Label>
            <Textarea rows={3} value={formState.description} onChange={field("description")} placeholder="Description in English…" />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "uk" ? "Опис (UK)" : "Description (UK)"}</Label>
            <Textarea rows={3} value={formState.description_uk} onChange={field("description_uk")} placeholder="Опис українською…" />
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "uk" ? "Переваги (EN) — кожна з нового рядка" : "Highlights (EN) — one per line"}</Label>
            <Textarea rows={4} value={formState.highlights} onChange={field("highlights")} placeholder={"Free breakfast\nLate checkout\nPool access"} />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "uk" ? "Переваги (UK) — кожна з нового рядка" : "Highlights (UK) — one per line"}</Label>
            <Textarea rows={4} value={formState.highlights_uk} onChange={field("highlights_uk")} placeholder={"Безкоштовний сніданок\nПізній виїзд\nБасейн"} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>{lang === "uk" ? "Знижка на проживання (%)" : "Accommodation discount (%)"}</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number" min={0} max={100} step={1} placeholder="0"
                value={formState.discount_percent}
                onChange={field("discount_percent")}
                className="w-32"
              />
              {parseFloat(formState.discount_percent) > 0 && (
                <span className="text-sm text-amber-700 bg-amber-100 px-3 py-1 rounded-full font-medium">
                  −{formState.discount_percent}% {lang === "uk" ? "від ціни проживання" : "off accommodation"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {lang === "uk"
                ? "0 = без знижки. Вводиться при ручному бронюванні."
                : "0 = no discount. Applied during manual booking creation."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "uk" ? "Діє з" : "Valid from"}</Label>
            <Input type="date" value={formState.valid_from} onChange={field("valid_from")} />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "uk" ? "Діє до" : "Valid to"}</Label>
            <Input type="date" value={formState.valid_to} onChange={field("valid_to")} />
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "uk" ? "Порядок сортування" : "Sort order"}</Label>
            <Input type="number" min={0} value={formState.sort_order} onChange={field("sort_order")} />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              id="is_active"
              checked={formState.is_active}
              onCheckedChange={v => setFormState(p => ({ ...p, is_active: v }))}
            />
            <Label htmlFor="is_active">{lang === "uk" ? "Активна" : "Active"}</Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {lang === "uk" ? "Скасувати" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending || !formState.title.trim()}>
            {saveMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Check className="h-4 w-4 mr-2" />}
            {lang === "uk" ? "Зберегти" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
