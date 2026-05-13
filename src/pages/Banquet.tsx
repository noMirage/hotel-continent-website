import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { addDays, format as dateFnsFormat } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Heart, Cake, Briefcase, Baby, Star, Monitor, Smile,
  UtensilsCrossed, BedDouble, Car, ChefHat, CalendarCheck, Sparkles,
  ArrowRight, X, ZoomIn, Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import type { EventType } from "@/lib/supabase-types";

// ── Form schema ───────────────────────────────────────────────────────────────

const banquetSchema = z.object({
  guest_name:   z.string().min(2, "Name is required"),
  guest_phone:  z.string().min(7, "Phone is required"),
  event_date:   z.string().min(1, "Event date is required"),
  guests_count: z.coerce.number().int().min(1, "At least 1 guest"),
  event_type:   z.string().min(1, "Please select event type") as z.ZodType<EventType>,
  comment:      z.string().optional(),
});

type BanquetFormValues = z.infer<typeof banquetSchema>;

// ── Data ──────────────────────────────────────────────────────────────────────

const EVENT_TYPES: Array<{ key: EventType; icon: React.ElementType; bg: string; iconColor: string }> = [
  { key: "wedding",     icon: Heart,      bg: "bg-rose-50",    iconColor: "text-rose-500" },
  { key: "birthday",    icon: Cake,       bg: "bg-yellow-50",  iconColor: "text-yellow-500" },
  { key: "corporate",   icon: Briefcase,  bg: "bg-blue-50",    iconColor: "text-blue-500" },
  { key: "christening", icon: Baby,       bg: "bg-sky-50",     iconColor: "text-sky-500" },
  { key: "anniversary", icon: Star,       bg: "bg-primary/10", iconColor: "text-primary" },
  { key: "conference",  icon: Monitor,    bg: "bg-slate-50",   iconColor: "text-slate-500" },
  { key: "kids_party",  icon: Smile,      bg: "bg-accent",     iconColor: "text-accent-foreground" },
];

const ADVANTAGES: Array<{ key: string; icon: React.ElementType; color: string }> = [
  { key: "hall",          icon: Sparkles,        color: "bg-primary/10 text-primary" },
  { key: "kitchen",       icon: UtensilsCrossed, color: "bg-orange-100 text-orange-600" },
  { key: "accommodation", icon: BedDouble,       color: "bg-indigo-100 text-indigo-600" },
  { key: "parking",       icon: Car,             color: "bg-muted text-muted-foreground" },
  { key: "menu",          icon: ChefHat,         color: "bg-emerald-100 text-emerald-600" },
  { key: "planning",      icon: CalendarCheck,   color: "bg-violet-100 text-violet-600" },
];

// Gallery photos (all 5 banquet shots)
const GALLERY = [
  { src: "/banquet-1.webp", span: "lg:col-span-2 lg:row-span-2" },  // large featured
  { src: "/banquet-2.webp", span: "" },
  { src: "/banquet-3.webp", span: "" },
  { src: "/banquet-4.webp", span: "" },
  { src: "/banquet-5.webp", span: "" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BanquetPage() {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const location = useLocation();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [eventDateOpen, setEventDateOpen] = useState(false);
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (location.hash === "#form") {
      const id = setTimeout(() => {
        document.getElementById("form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(id);
    }
  }, [location.hash]);

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BanquetFormValues>({ resolver: zodResolver(banquetSchema) });

  async function onSubmit(values: BanquetFormValues) {
    const { error } = await supabase.from("reservations").insert({
      guest_name:        values.guest_name,
      guest_email:       "",
      guest_phone:       values.guest_phone,
      check_in_date:     values.event_date,
      check_out_date:    dateFnsFormat(addDays(new Date(values.event_date), 1), "yyyy-MM-dd"),
      num_guests:        values.guests_count,
      total_price:       0,
      tourist_tax_amount: 0,
      early_checkin_fee: 0,
      late_checkout_fee: 0,
      commission_rate:   0,
      status:            "UNPROCESSED",
      booking_source:    "SITE",
      type:              "banquet",
      event_type:        values.event_type,
      guests_count:      values.guests_count,
      special_requests:  values.comment || null,
      has_accommodation: false,
      has_menu:          false,
      has_decor:         false,
      has_music:         false,
    });
    if (error) { if (import.meta.env.DEV) console.error(error); toast.error(t("banquet.form.errorTitle"), { description: t("common.unexpectedError") }); return; }
    toast.success(t("banquet.form.successTitle"), { description: t("banquet.form.successDesc") });
    reset();
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero — full-bleed photo with overlay ── */}
      <section className="relative h-[60vh] min-h-[400px] flex items-end overflow-hidden">
        <img
          src="/banquet-5.webp"
          alt="Banquet hall"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/40 to-foreground/10" />

        <div className="relative container mx-auto px-4 pb-14 md:pb-20">
          <p className="text-primary font-medium tracking-widest uppercase text-xs mb-3">
            {t("banquet.hero.eyebrow")}
          </p>
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-primary-foreground mb-4 max-w-2xl leading-tight">
            {t("banquet.hero.title")}
          </h1>
          <p className="text-primary-foreground/70 text-base md:text-lg max-w-xl mb-8 leading-relaxed">
            {t("banquet.hero.subtitle")}
          </p>
          <Button size="lg" asChild className="text-sm px-7 gap-2">
            <a href="#form">
              {t("banquet.hero.cta")}
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* ── Gallery ── */}
      <section className="py-16 md:py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-primary/70 font-medium tracking-widest uppercase text-xs mb-2">
              {t("banquet.gallery.eyebrow")}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-secondary-foreground">
              {t("banquet.gallery.title")}
            </h2>
          </div>

          {/* Mosaic grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 grid-rows-2 gap-2 md:gap-3 max-w-5xl mx-auto h-[420px] md:h-[500px]">
            {GALLERY.map((photo, i) => (
              <button
                key={i}
                onClick={() => setLightbox(photo.src)}
                className={`relative overflow-hidden rounded-xl group focus:outline-none ${photo.span}`}
              >
                <img
                  src={photo.src}
                  alt={`Banquet ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-7 w-7 text-secondary-foreground opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Event types ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-primary font-medium tracking-widest uppercase text-xs mb-3">
              {t("banquet.events.eyebrow")}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("banquet.events.title")}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("banquet.events.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 max-w-4xl mx-auto">
            {EVENT_TYPES.map(({ key, icon: Icon, bg, iconColor }) => (
              <div
                key={key}
                className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-default text-center"
              >
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
                <p className="text-xs font-medium text-foreground leading-snug">
                  {t(`banquet.eventType.${key}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Advantages ── */}
      <section className="py-16 md:py-24 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-primary font-medium tracking-widest uppercase text-xs mb-3">
              {t("banquet.advantages.eyebrow")}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
              {t("banquet.advantages.title")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {ADVANTAGES.map(({ key, icon: Icon, color }) => (
              <div
                key={key}
                className="flex items-start gap-4 p-5 bg-background rounded-2xl border border-border hover:shadow-md transition-shadow"
              >
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">{t(`banquet.advantage.${key}.title`)}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`banquet.advantage.${key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Booking form ── */}
      <section id="form" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-start">

            {/* Left: heading + photo */}
            <div className="space-y-6">
              <div>
                <p className="text-primary font-medium tracking-widest uppercase text-xs mb-3">
                  {t("banquet.form.eyebrow")}
                </p>
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                  {t("banquet.form.title")}
                </h2>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {t("banquet.form.subtitle")}
                </p>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/3]">
                <img
                  src="/banquet-2.webp"
                  alt="Banquet table"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right: form */}
            <Card className="shadow-lg border-border">
              <CardContent className="pt-7 px-6 pb-7">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                  <div className="space-y-1.5">
                    <Label htmlFor="guest_name">{t("banquet.form.name")} *</Label>
                    <Input id="guest_name" {...register("guest_name")} placeholder={t("banquet.form.namePlaceholder")} />
                    {errors.guest_name && <p className="text-xs text-destructive">{errors.guest_name.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="guest_phone">{t("banquet.form.phone")} *</Label>
                    <Input id="guest_phone" type="tel" {...register("guest_phone")} placeholder="+380..." />
                    {errors.guest_phone && <p className="text-xs text-destructive">{errors.guest_phone.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("banquet.form.eventDate")} *</Label>
                      <Popover open={eventDateOpen} onOpenChange={setEventDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !eventDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            {eventDate
                              ? dateFnsFormat(eventDate, "d MMM yyyy", { locale: dateLocale })
                              : t("banquet.form.pickDate")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={eventDate}
                            onSelect={(date) => {
                              setEventDate(date);
                              setValue("event_date", date ? dateFnsFormat(date, "yyyy-MM-dd") : "", { shouldValidate: true });
                              setEventDateOpen(false);
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            locale={dateLocale}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.event_date && <p className="text-xs text-destructive">{errors.event_date.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="guests_count">{t("banquet.form.guestsCount")} *</Label>
                      <Input id="guests_count" type="number" min={1} {...register("guests_count")} placeholder="50" />
                      {errors.guests_count && <p className="text-xs text-destructive">{errors.guests_count.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t("banquet.form.eventType")} *</Label>
                    <Select onValueChange={val => setValue("event_type", val as EventType, { shouldValidate: true })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("banquet.form.eventTypePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map(({ key, icon: Icon }) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              {t(`banquet.eventType.${key}`)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.event_type && <p className="text-xs text-destructive">{errors.event_type.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="comment">{t("banquet.form.comment")}</Label>
                    <Textarea
                      id="comment"
                      {...register("comment")}
                      placeholder={t("banquet.form.commentPlaceholder")}
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? t("banquet.form.submitting") : (
                      <>
                        {t("banquet.form.submit")}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-5 right-5 p-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Banquet"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
