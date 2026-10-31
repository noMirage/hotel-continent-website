import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-hotel.webp";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";
import { AvailabilitySearchWidget, type SearchParams } from "./AvailabilitySearchWidget";

interface HeroSectionProps {
  onSearch: (params: SearchParams) => void;
}

export function HeroSection({ onSearch }: HeroSectionProps) {
  const { t } = useLanguage();
  const { hotelName } = useHotelSettings();

  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden pb-8">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt={`${hotelName} lobby`}
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-foreground/80" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 flex flex-col items-center gap-8 py-16">
        {/* Headline */}
        <div className="text-center">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 leading-tight">
            {hotelName}
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-primary-foreground/90 mb-6 max-w-2xl mx-auto">
            {t("hotel.tagline")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-base px-8">
              <Link to="/rooms">{t("hero.exploreRooms")}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-base px-8 bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20 hover:text-primary-foreground"
            >
              <Link to="/about">{t("hero.discoverMore")}</Link>
            </Button>
          </div>
        </div>

        {/* Search widget */}
        <div id="search" className="w-full max-w-4xl">
          <AvailabilitySearchWidget onSearch={onSearch} />
        </div>
      </div>
    </section>
  );
}
