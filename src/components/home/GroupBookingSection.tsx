import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import {
  Users, Check, Loader2, X, CalendarIcon, BadgePercent,
  UserCheck, Star, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  phone: string;
  email: string;
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  numGuests: string;
  wishes: string;
}

function emptyForm(defaults?: GroupRequestDefaults): FormState {
  return {
    name:      "",
    phone:     "",
    email:     "",
    checkIn:   defaults?.checkIn,
    checkOut:  defaults?.checkOut,
    numGuests: defaults?.numGuests ? String(defaults.numGuests) : "",
    wishes:    "",
  };
}

export interface GroupRequestDefaults {
  checkIn?: Date;
  checkOut?: Date;
  numGuests?: number;
}

// ── Shared form component ─────────────────────────────────────────────────────

function GroupBookingForm({
  defaults,
  onSuccess,
  compact = false,
}: {
  defaults?: GroupRequestDefaults;
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const { t, language } = useLanguage();
  const lang = language as "en" | "uk";
  const dateLocale = lang === "uk" ? ukLocale : enUS;
  const { toast } = useToast();

  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = addDays(today, 1);

  const [form, setForm] = useState<FormState>(() => emptyForm(defaults));
  const [submitted, setSubmitted] = useState(false);

  const nights = form.checkIn && form.checkOut
    ? Math.max(0, Math.round((form.checkOut.getTime() - form.checkIn.getTime()) / 86_400_000))
    : null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.checkIn || !form.checkOut) throw new Error("dates");
      const { error } = await supabase.from("group_booking_requests").insert({
        guest_name:  form.name.trim(),
        guest_phone: form.phone.trim(),
        guest_email: form.email.trim() || null,
        check_in:    format(form.checkIn,  "yyyy-MM-dd"),
        check_out:   format(form.checkOut, "yyyy-MM-dd"),
        num_guests:  parseInt(form.numGuests) || 1,
        wishes:      form.wishes.trim() || null,
        status:      "new",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title:       t("groupRequest.success"),
        description: t("groupRequest.successDesc"),
      });
      onSuccess?.();
    },
    onError: () => toast({ title: lang === "uk" ? "Помилка" : "Error", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.checkIn || !form.checkOut || !form.numGuests) return;
    mutation.mutate();
  };

  const f = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  if (submitted) {
    return (
      <div className="text-center py-10 space-y-3 animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <p className="font-serif text-xl font-semibold text-foreground">{t("groupRequest.success")}</p>
        <p className="text-muted-foreground text-sm">{t("groupRequest.successDesc")}</p>
        <Button variant="outline" size="sm" onClick={() => { setForm(emptyForm(defaults)); setSubmitted(false); }}>
          {lang === "uk" ? "Нова заявка" : "New request"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", compact && "space-y-3")}>
      {/* Name + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gr-name">{t("groupRequest.name")} *</Label>
          <Input
            id="gr-name"
            value={form.name}
            onChange={f("name")}
            placeholder={t("groupRequest.namePlaceholder")}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gr-phone">{t("groupRequest.phone")} *</Label>
          <Input
            id="gr-phone"
            type="tel"
            value={form.phone}
            onChange={f("phone")}
            placeholder="+380 50 000 00 00"
            required
          />
        </div>
      </div>

      {/* Check-in + Check-out */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t("groupRequest.checkIn")} *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn("w-full justify-start text-left font-normal h-10", !form.checkIn && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary/60" />
                {form.checkIn ? format(form.checkIn, "dd MMM yyyy", { locale: dateLocale }) : (lang === "uk" ? "Оберіть дату" : "Select date")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={form.checkIn}
                onSelect={d => {
                  setForm(p => ({
                    ...p,
                    checkIn: d ?? undefined,
                    checkOut: d && p.checkOut && p.checkOut <= d ? addDays(d, 1) : p.checkOut,
                  }));
                }}
                disabled={d => d < today}
                locale={dateLocale}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label>{t("groupRequest.checkOut")} *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn("w-full justify-start text-left font-normal h-10", !form.checkOut && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary/60" />
                {form.checkOut ? (
                  <span>
                    {format(form.checkOut, "dd MMM yyyy", { locale: dateLocale })}
                    {nights !== null && nights > 0 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({nights} {lang === "uk" ? (nights === 1 ? "ніч" : nights < 5 ? "ночі" : "ночей") : nights === 1 ? "night" : "nights"})
                      </span>
                    )}
                  </span>
                ) : (lang === "uk" ? "Оберіть дату" : "Select date")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={form.checkOut}
                onSelect={d => setForm(p => ({ ...p, checkOut: d ?? undefined }))}
                disabled={d => !form.checkIn ? d < tomorrow : d <= form.checkIn}
                locale={dateLocale}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Guests + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gr-guests">{t("groupRequest.numGuests")} *</Label>
          <Input
            id="gr-guests"
            type="number"
            min={1}
            value={form.numGuests}
            onChange={f("numGuests")}
            placeholder="20"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gr-email">{t("groupRequest.email")}</Label>
          <Input
            id="gr-email"
            type="email"
            value={form.email}
            onChange={f("email")}
            placeholder="your@email.com"
          />
        </div>
      </div>

      {/* Wishes */}
      <div className="space-y-1.5">
        <Label htmlFor="gr-wishes">{t("groupRequest.wishes")}</Label>
        <Textarea
          id="gr-wishes"
          value={form.wishes}
          onChange={f("wishes")}
          placeholder={t("groupRequest.wishesPlaceholder")}
          rows={compact ? 2 : 3}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        size={compact ? "default" : "lg"}
        disabled={mutation.isPending || !form.name || !form.phone || !form.checkIn || !form.checkOut || !form.numGuests}
      >
        {mutation.isPending
          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("groupRequest.sending")}</>
          : <><Check className="h-4 w-4 mr-2" />{t("groupRequest.submit")}</>}
      </Button>
    </form>
  );
}

// ── Exported dialog (used in AvailabilityResultsSection) ──────────────────────

export function GroupBookingRequestDialog({
  open,
  onOpenChange,
  defaults,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaults?: GroupRequestDefaults;
}) {
  const { t } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{t("groupRequest.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("groupRequest.dialogDesc")}</DialogDescription>
        </DialogHeader>
        <GroupBookingForm
          defaults={defaults}
          onSuccess={() => onOpenChange(false)}
          compact
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Home page section ─────────────────────────────────────────────────────────

const BENEFITS = [
  { key: "groupRequest.benefit1", icon: BadgePercent },
  { key: "groupRequest.benefit2", icon: UserCheck },
  { key: "groupRequest.benefit3", icon: Star },
  { key: "groupRequest.benefit4", icon: CreditCard },
] as const;

export function GroupBookingSection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start max-w-5xl mx-auto">

          {/* Left: info */}
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-left-4 duration-500">
            <div>
              <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("groupRequest.eyebrow")}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                {t("groupRequest.title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("groupRequest.subtitle")}
              </p>
            </div>

            <ul className="space-y-3">
              {BENEFITS.map(({ key, icon: Icon }) => (
                <li key={key} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4.5 w-4.5 text-primary" style={{ width: 18, height: 18 }} />
                  </div>
                  <span className="text-foreground font-medium">{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: form */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-lg p-6 md:p-8 animate-in fade-in-0 slide-in-from-right-4 duration-500">
            <GroupBookingForm />
          </div>
        </div>
      </div>
    </section>
  );
}
