import { Award, Heart, Leaf } from "lucide-react";
import heroImage from "@/assets/hero-hotel.webp";
import hotelHall from "@/assets/hotel-hall.webp";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";
import { FadeIn } from "@/components/ui/FadeIn";

const values = [
  { icon: Award,  titleKey: "about.value.excellence",  descKey: "about.value.excellenceDesc"  },
  { icon: Heart,  titleKey: "about.value.hospitality", descKey: "about.value.hospitalityDesc" },
  { icon: Leaf,   titleKey: "about.value.nature",      descKey: "about.value.natureDesc"      },
] as const;

const stats = [
  { value: "2005", labelKey: "about.stat.founded" },
  { value: "50+",  labelKey: "about.stat.rooms" },
  { value: "20k+", labelKey: "about.stat.guests" },
  { value: "4★",   labelKey: "about.stat.location" },
] as const;

export default function AboutPage() {
  const { t } = useLanguage();
  const { hotelName } = useHotelSettings();

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="relative h-[55vh] min-h-[420px] flex items-end overflow-hidden">
        <img src={heroImage} alt={hotelName} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
        <div className="relative container mx-auto px-4 pb-12">
          <FadeIn direction="up">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary-foreground mb-3">
              {t("about.title")} {hotelName}
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl">{t("hotel.tagline")}</p>
          </FadeIn>
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-primary-foreground/20">
            {stats.map(({ value, labelKey }, i) => (
              <FadeIn key={labelKey} delay={i * 80} direction="none">
                <div className="py-6 px-4 text-center">
                  <p className="font-serif text-3xl font-bold">{value}</p>
                  <p className="text-sm text-primary-foreground/70 mt-1">{t(labelKey)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>

      {/* Story — split layout */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
            <FadeIn direction="left">
              <div className="relative rounded-2xl overflow-hidden h-72 md:h-96 shadow-xl">
                <img
                  src={hotelHall}
                  alt={t("about.photoAlt")}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-foreground/10" />
              </div>
            </FadeIn>
            <FadeIn direction="right">
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
                {t("about.storyHeading")}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>{t("about.story1", { name: hotelName } as any)}</p>
                <p>{t("about.story2", { name: hotelName } as any)}</p>
                <p>{t("about.story3", { name: hotelName } as any)}</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("about.ourValues")}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map(({ icon: Icon, titleKey, descKey }, i) => (
              <FadeIn key={titleKey} delay={i * 120} direction="up">
                <div className="text-center p-8 rounded-2xl border border-border bg-background hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground mb-3">{t(titleKey)}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{t(descKey)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
