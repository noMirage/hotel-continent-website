import { Mountain, Waves, Bike, MapPin, Thermometer, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const activities = [
  {
    key: "mineral",
    icon: Waves,
    color: "text-blue-600",
    photo: "/leisure/mineral-water.jpg",
  },
  {
    key: "ski",
    icon: Mountain,
    color: "text-slate-600",
    photo: "/leisure/snow.jpg",
  },
  {
    key: "excursions",
    icon: MapPin,
    color: "text-green-600",
    photo: "/leisure/castle.webp",
  },
  {
    key: "atv",
    icon: Bike,
    color: "text-orange-600",
    photo: "/leisure/atv.webp",
  },
  {
    key: "thermal",
    icon: Thermometer,
    color: "text-red-600",
    photo: "/leisure/thermal-outdoor.webp",
  },
  {
    key: "eco",
    icon: TreePine,
    color: "text-emerald-600",
    photo: "/leisure/nature.jpg",
  },
];

export default function LeisurePage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="relative h-[65vh] min-h-[440px] flex items-end overflow-hidden">
        <img
          src="/leisure/hero.webp"
          alt="Carpathian mountains"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="relative container mx-auto px-4 pb-14">
          <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">
            {t("leisure.eyebrow")}
          </p>
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
            {t("leisure.title")}
          </h1>
          <p className="text-lg text-white/75 max-w-2xl leading-relaxed">
            {t("leisure.subtitle")}
          </p>
        </div>
      </section>

      {/* Activities */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.key}
                  className="group rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/40 hover:shadow-xl transition-all duration-300"
                >
                  {/* Photo */}
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={activity.photo}
                      alt={t(`leisure.${activity.key}.title` as any)}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="px-6 pb-6">
                    {/* Icon chip — overlaps photo edge */}
                    <div className="relative -mt-6 mb-4 w-12 h-12 rounded-xl bg-background border border-border shadow-md flex items-center justify-center">
                      <Icon className={`h-6 w-6 ${activity.color}`} />
                    </div>

                    <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                      {t(`leisure.${activity.key}.title` as any)}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      {t(`leisure.${activity.key}.desc` as any)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="text-xs px-3 py-1 rounded-full bg-accent text-accent-foreground font-medium"
                        >
                          {t(`leisure.${activity.key}.tag${i}` as any)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Entertainment strip */}
      <section className="py-16 md:py-20 bg-stone-900">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Text */}
            <div>
              <p className="text-primary font-medium tracking-widest uppercase text-xs mb-4">
                {t("leisure.entertainment.eyebrow")}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-5 leading-tight">
                {t("leisure.entertainment.title")}
              </h2>
              <p className="text-stone-300 text-base md:text-lg leading-relaxed mb-8 max-w-md">
                {t("leisure.entertainment.desc")}
              </p>
            </div>

            {/* Photo */}
            <div className="relative rounded-2xl overflow-hidden h-72 lg:h-80 shadow-2xl">
              <img
                src="/leisure/billiards.webp"
                alt="Game room"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/10" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5 border-y border-border">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl font-bold text-foreground mb-4">
            {t("leisure.cta.title")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            {t("leisure.cta.desc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/rooms">{t("leisure.cta.book")}</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/contact">{t("leisure.cta.contact")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
