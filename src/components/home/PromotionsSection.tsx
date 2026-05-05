import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { Globe, Check, Loader2, X, Sparkles, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Carousel, CarouselContent, CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { QK } from "@/lib/queryKeys";
import type { Promotion } from "@/lib/supabase-types";

// ── Keyframe animations ───────────────────────────────────────────────────────

const ANIM_STYLES = `
@keyframes promoFadeUp {
  from { opacity: 0; transform: translateY(28px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes discountBadgePop {
  0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
  65%  { transform: scale(1.18) rotate(3deg); opacity: 1; }
  100% { transform: scale(1)   rotate(0deg); opacity: 1; }
}
@keyframes discountBadgeRing {
  0%   { box-shadow: 0 0 0 0px rgba(217,119,6,0.65); }
  70%  { box-shadow: 0 0 0 9px rgba(217,119,6,0);    }
  100% { box-shadow: 0 0 0 0px rgba(217,119,6,0);    }
}
@keyframes discountTextPulse {
  0%,100% { transform: scale(1);    }
  50%     { transform: scale(1.18); }
}
.promo-card-enter {
  animation: promoFadeUp 0.55s cubic-bezier(.22,.68,0,1.2) both;
}
.discount-badge-enter {
  animation: discountBadgePop 0.5s cubic-bezier(.22,.68,0,1.2) both;
}
.discount-badge-ring {
  animation: discountBadgePop 0.5s cubic-bezier(.22,.68,0,1.2) both,
             discountBadgeRing 1.9s ease-out 0.7s infinite;
}
.discount-pct {
  display: inline-block;
  animation: discountTextPulse 1.9s ease-in-out infinite;
}
`;

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ lang }: { lang: "en" | "uk" }) {
  return (
    <div className="text-center py-12 mb-10 animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="h-9 w-9 text-primary/50" />
      </div>
      <h3 className="font-serif text-2xl font-semibold text-foreground mb-3">
        {lang === "uk" ? "Гарячі пропозиції вже в дорозі!" : "Hot Offers Are Coming!"}
      </h3>
      <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {lang === "uk"
          ? "Ми готуємо для вас ексклюзивні акції та знижки. Стежте за оновленнями!"
          : "We're preparing exclusive deals and discounts just for you. Stay tuned for updates!"}
      </p>
    </div>
  );
}

// ── Promotion card ────────────────────────────────────────────────────────────

function PromotionCard({
  promo, lang, onRequest, ctaLabel, animDelay,
}: {
  promo: Promotion; lang: "en" | "uk"; onRequest: () => void;
  ctaLabel: string; animDelay: number;
}) {
  const title       = (lang === "uk" && promo.title_uk)       ? promo.title_uk       : promo.title;
  const description = (lang === "uk" && promo.description_uk) ? promo.description_uk : promo.description;
  const badge       = (lang === "uk" && promo.badge_uk)       ? promo.badge_uk       : promo.badge;
  const highlights  = (lang === "uk" && promo.highlights_uk?.length) ? promo.highlights_uk : promo.highlights;
  const hasDiscount = promo.discount_percent > 0;
  const dateLocale  = lang === "uk" ? ukLocale : enUS;

  const validFrom = promo.valid_from ? format(parseISO(promo.valid_from), "d MMM yyyy", { locale: dateLocale }) : null;
  const validTo   = promo.valid_to   ? format(parseISO(promo.valid_to),   "d MMM yyyy", { locale: dateLocale }) : null;
  const hasDate   = validFrom || validTo;

  return (
    <div className="promo-card-enter h-full" style={{ animationDelay: `${animDelay}ms` }}>
      <Card className={cn(
        "relative overflow-hidden border-border h-full flex flex-col",
        "hover:-translate-y-2 hover:shadow-2xl hover:border-primary/40",
        "transition-all duration-300 group",
      )}>
        {/* Top gradient stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />

        {/* Discount badge — whole badge pulses with ring + text scales */}
        {hasDiscount && (
          <div
            className="discount-badge-ring absolute top-4 right-4 z-10 bg-amber-500 text-white font-bold text-sm leading-none px-3 py-2 rounded-full shadow-lg"
            style={{ animationDelay: `${animDelay + 200}ms` }}
          >
            −<span className="discount-pct">{promo.discount_percent}%</span>
          </div>
        )}

        <CardHeader className={cn("pb-4 pt-8", hasDiscount && "pr-16")}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors duration-300">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              {badge && (
                <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-1 block">{badge}</span>
              )}
              <CardTitle className="font-serif text-xl text-foreground leading-tight">{title}</CardTitle>
              {hasDiscount && (
                <p className="text-xs text-amber-600 font-medium mt-1">
                  {lang === "uk"
                    ? `Знижка ${promo.discount_percent}% на проживання`
                    : `${promo.discount_percent}% off accommodation`}
                </p>
              )}
              {hasDate && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  {validFrom && validTo
                    ? `${validFrom} – ${validTo}`
                    : validFrom
                      ? (lang === "uk" ? `з ${validFrom}` : `from ${validFrom}`)
                      : (lang === "uk" ? `до ${validTo}` : `until ${validTo}`)}
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 flex-1 flex flex-col">
          {description && (
            <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
          )}
          {highlights.length > 0 && (
            <ul className="space-y-2 flex-1">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
          <Button className="w-full mt-auto group-hover:bg-primary/90 transition-colors" onClick={onRequest}>
            {ctaLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Centered grid (1–3 cards) ─────────────────────────────────────────────────

function CenteredGrid({ promotions, lang, onRequest, ctaLabel }: {
  promotions: Promotion[]; lang: "en" | "uk";
  onRequest: (p: Promotion) => void; ctaLabel: string;
}) {
  const count = promotions.length;
  return (
    <div className={cn(
      "grid gap-6 mb-10 mx-auto w-full",
      count === 1 && "grid-cols-1 max-w-sm",
      count === 2 && "grid-cols-1 sm:grid-cols-2 max-w-2xl",
      count === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl",
    )}>
      {promotions.map((promo, index) => (
        <PromotionCard
          key={promo.id}
          promo={promo}
          lang={lang}
          onRequest={() => onRequest(promo)}
          ctaLabel={ctaLabel}
          animDelay={index * 120}
        />
      ))}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export function PromotionsSection() {
  const { t, language } = useLanguage();
  const lang = language as "en" | "uk";
  const { toast } = useToast();
  const [activePromo, setActivePromo] = useState<Promotion | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", comment: "" });

  // Carousel API for dot indicators
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrent(carouselApi.selectedScrollSnap());
    carouselApi.on("select", onSelect);
    return () => { carouselApi.off("select", onSelect); };
  }, [carouselApi]);

  const { data: promotions, isLoading } = useQuery({
    queryKey: QK.activePromotions(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("id,title,title_uk,description,description_uk,badge,badge_uk,highlights,highlights_uk,discount_percent,valid_from,valid_to")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Promotion[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const submitMutation = useMutation({
    mutationFn: async (values: typeof form & { promo: Promotion }) => {
      const { error } = await supabase.from("promo_applications").insert({
        promotion_id:    values.promo.id,
        promotion_title: values.promo.title,
        guest_name:      values.fullName.trim(),
        guest_phone:     values.phone.trim(),
        guest_email:     values.email.trim() || null,
        comment:         values.comment.trim() || null,
        status:          "new",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("promos.requestSent"), description: t("promos.requestSentDesc") });
      setForm({ fullName: "", phone: "", email: "", comment: "" });
      setActivePromo(null);
    },
    onError: () => toast({ title: t("guestForm.errorTitle"), variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !activePromo) return;
    submitMutation.mutate({ ...form, promo: activePromo });
  };

  const count = promotions?.length ?? 0;
  const hasPromos = count > 0;
  const useCarousel = count > 3;

  return (
    <section className="py-16 md:py-24 bg-card border-y border-border">
      <style>{ANIM_STYLES}</style>

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">
            {t("promos.eyebrow")}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("promos.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("promos.subtitle")}</p>
        </div>

        {/* Cards area */}
        {isLoading ? (
          <div className="flex gap-6 max-w-4xl mx-auto mb-10 justify-center">
            {[1, 2].map(i => <Skeleton key={i} className="h-72 rounded-xl flex-1 max-w-sm" />)}
          </div>
        ) : !hasPromos ? (
          <EmptyState lang={lang} />
        ) : useCarousel ? (
          /* ── Carousel (4+ cards) ── */
          <div className="mb-10 relative">
            <Carousel
              setApi={setCarouselApi}
              opts={{ align: "start", loop: true, dragFree: false }}
              className="w-full max-w-5xl mx-auto"
            >
              <CarouselContent className="-ml-4">
                {promotions!.map((promo, index) => (
                  <CarouselItem key={promo.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                    <PromotionCard
                      promo={promo} lang={lang}
                      onRequest={() => setActivePromo(promo)}
                      ctaLabel={t("promos.requestOffer")}
                      animDelay={index * 100}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>

              {/* Nav arrows */}
              <button onClick={() => carouselApi?.scrollPrev()} aria-label="Previous"
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-md hidden sm:flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => carouselApi?.scrollNext()} aria-label="Next"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-md hidden sm:flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200">
                <ChevronRight className="h-5 w-5" />
              </button>
            </Carousel>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {promotions!.map((_, i) => (
                <button key={i} onClick={() => carouselApi?.scrollTo(i)} aria-label={`Slide ${i + 1}`}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === current ? "w-6 h-2.5 bg-primary" : "w-2.5 h-2.5 bg-primary/25 hover:bg-primary/50",
                  )}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ── Centered grid (1–3 cards) ── */
          <CenteredGrid
            promotions={promotions!}
            lang={lang}
            onRequest={setActivePromo}
            ctaLabel={t("promos.requestOffer")}
          />
        )}

        {/* Website discount banner */}
        <div className="max-w-4xl mx-auto animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-300">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-gradient-to-r from-primary/10 via-accent to-secondary/10 border border-primary/20 rounded-xl px-8 py-5">
            <Globe className="h-8 w-8 text-primary shrink-0" />
            <div className="text-center sm:text-left">
              <p className="font-serif text-xl font-bold text-foreground">{t("promos.webDiscount.title")}</p>
              <p className="text-muted-foreground text-sm">{t("promos.webDiscount.desc")}</p>
            </div>
            <Button className="sm:ml-auto shrink-0" asChild>
              <a href="/rooms">{t("promos.webDiscount.cta")}</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Application dialog */}
      <Dialog open={!!activePromo} onOpenChange={() => setActivePromo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {activePromo
                ? ((lang === "uk" && activePromo.title_uk) ? activePromo.title_uk : activePromo.title)
                : ""}
            </DialogTitle>
            <DialogDescription>
              {activePromo && activePromo.discount_percent > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium text-sm mr-1.5">
                  −{activePromo.discount_percent}%
                  {lang === "uk" ? " на проживання" : " off accommodation"} ·
                </span>
              )}
              {t("promos.dialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="pf-name">{t("promos.form.fullName")} *</Label>
              <Input id="pf-name" value={form.fullName}
                onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                placeholder={t("promos.form.fullNamePlaceholder")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-phone">{t("promos.form.phone")} *</Label>
              <Input id="pf-phone" type="tel" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+380 50 000 00 00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-email">{t("promos.form.email")}</Label>
              <Input id="pf-email" type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="your@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-comment">{t("promos.form.comment")}</Label>
              <Textarea id="pf-comment" value={form.comment}
                onChange={e => setForm(p => ({ ...p, comment: e.target.value }))}
                placeholder={t("promos.form.commentPlaceholder")} rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1"
                disabled={submitMutation.isPending || !form.fullName || !form.phone}>
                {submitMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("promos.form.sending")}</>
                  : t("promos.form.send")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setActivePromo(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
