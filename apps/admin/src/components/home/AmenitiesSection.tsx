import { Sparkles, UtensilsCrossed, Users, Waves, Bell, Wifi } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  UtensilsCrossed,
  Users,
  Waves,
  Bell,
  Wifi,
};

const amenityKeys = [
  { nameKey: "amenities.spa" as const, descKey: "amenities.spaDesc" as const, icon: "Sparkles" },
  { nameKey: "amenities.dining" as const, descKey: "amenities.diningDesc" as const, icon: "UtensilsCrossed" },
  { nameKey: "amenities.fitness" as const, descKey: "amenities.fitnessDesc" as const, icon: "Users" },
  { nameKey: "amenities.pool" as const, descKey: "amenities.poolDesc" as const, icon: "Waves" },
  { nameKey: "amenities.concierge" as const, descKey: "amenities.conciergeDesc" as const, icon: "Bell" },
  { nameKey: "amenities.wifi" as const, descKey: "amenities.wifiDesc" as const, icon: "Wifi" },
];

export function AmenitiesSection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("amenities.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("amenities.subtitle")}
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {amenityKeys.map((amenity) => {
            const Icon = iconMap[amenity.icon];
            return (
              <div
                key={amenity.nameKey}
                className="group p-6 md:p-8 bg-card rounded-lg border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  {Icon && <Icon className="h-6 w-6 text-accent-foreground" />}
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  {t(amenity.nameKey)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(amenity.descKey)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
