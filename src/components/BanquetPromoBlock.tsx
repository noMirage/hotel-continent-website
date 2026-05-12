import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Cake, Briefcase, Star, ArrowRight, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const EVENT_CHIPS = [
  { icon: Heart,    colorBg: "bg-primary/15",  colorText: "text-primary-foreground/80", key: "wedding" },
  { icon: Cake,     colorBg: "bg-accent",       colorText: "text-accent-foreground",     key: "birthday" },
  { icon: Briefcase,colorBg: "bg-muted",        colorText: "text-muted-foreground",      key: "corporate" },
  { icon: Star,     colorBg: "bg-primary/10",   colorText: "text-primary",               key: "anniversary" },
];

const PHOTOS = [
  { src: "/banquet-1.webp", alt: "Banquet hall" },
  { src: "/banquet-2.webp", alt: "Banquet table" },
  { src: "/banquet-3.webp", alt: "Banquet setup" },
  { src: "/banquet-4.webp", alt: "Banquet dining" },
];

export function BanquetPromoBlock() {
  const { t } = useLanguage();
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <>
      <section className="relative overflow-hidden bg-secondary">
        <div className="grid lg:grid-cols-2 min-h-[520px]">

          {/* ── Left: content ── */}
          <div className="relative z-10 flex flex-col justify-center px-8 py-16 md:px-14 md:py-20">
            {/* Subtle warm glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-transparent pointer-events-none" />

            <div className="relative">
              <p className="text-primary/80 font-medium tracking-widest uppercase text-xs mb-4">
                {t("banquet.promo.eyebrow")}
              </p>

              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-foreground mb-5 leading-tight">
                {t("banquet.promo.heading")}
              </h2>

              <p className="text-secondary-foreground/70 text-base md:text-lg mb-8 max-w-md leading-relaxed">
                {t("banquet.promo.subheading")}
              </p>

              {/* Event type chips */}
              <div className="flex flex-wrap gap-2 mb-10">
                {EVENT_CHIPS.map(({ icon: Icon, colorBg, colorText, key }) => (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-secondary-foreground/10 ${colorBg} ${colorText}`}
                  >
                    <Icon className="h-3 w-3" />
                    {t(`banquet.eventType.${key}`)}
                  </span>
                ))}
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border border-secondary-foreground/10 bg-secondary-foreground/10 text-secondary-foreground/70">
                  {t("banquet.promo.andMore")}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" asChild className="text-sm px-7 gap-2">
                  <Link to="/banquet#form">
                    {t("banquet.promo.bookBanquet")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="text-sm px-7 border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground bg-transparent"
                >
                  <Link to="/banquet">{t("banquet.promo.learnMore")}</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* ── Right: photo mosaic ── */}
          <div className="relative hidden lg:grid grid-cols-2 grid-rows-2 gap-1">
            {PHOTOS.map((photo, i) => (
              <button
                key={i}
                onClick={() => setLightbox(photo.src)}
                className="relative overflow-hidden group focus:outline-none"
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ minHeight: 0 }}
                />
                <div className="absolute inset-0 bg-foreground/20 group-hover:bg-foreground/10 transition-colors" />
              </button>
            ))}
            {/* Vertical fade overlay on left edge blending into content panel */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-secondary to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Mobile: single photo strip */}
        <div className="lg:hidden relative h-52 overflow-hidden">
          <img
            src={PHOTOS[0].src}
            alt={PHOTOS[0].alt}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/30 to-transparent" />
        </div>
      </section>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-secondary-foreground/80 hover:text-secondary-foreground"
            onClick={() => setLightbox(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightbox}
            alt="Banquet"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
