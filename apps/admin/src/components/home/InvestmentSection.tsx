import { TrendingUp, Shield, Building2, ExternalLink, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

export function InvestmentSection() {
  const { t } = useLanguage();

  const stats = [
    { label: t("invest.stat1.label"), value: t("invest.stat1.value"), icon: TrendingUp },
    { label: t("invest.stat2.label"), value: t("invest.stat2.value"), icon: BarChart3 },
    { label: t("invest.stat3.label"), value: t("invest.stat3.value"), icon: Shield },
    { label: t("invest.stat4.label"), value: t("invest.stat4.value"), icon: Building2 },
  ];

  return (
    <section className="py-16 md:py-24 bg-foreground text-primary-foreground relative overflow-hidden">
      {/* Decorative background texture */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)",
          backgroundSize: "20px 20px"
        }} />
      </div>

      <div className="relative container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: text */}
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Building2 className="h-4 w-4" />
              ContInvest
            </div>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-primary-foreground mb-6 leading-tight">
              {t("invest.title")}
            </h2>
            <p className="text-primary-foreground/70 leading-relaxed mb-6 text-lg">
              {t("invest.desc1")}
            </p>
            <p className="text-primary-foreground/60 leading-relaxed mb-8">
              {t("invest.desc2")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                asChild
              >
                <a href="https://continent.ua" target="_blank" rel="noopener noreferrer">
                  {t("invest.learnMore")}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground transition-colors"
                asChild
              >
                <a href="/contact">{t("invest.contactUs")}</a>
              </Button>
            </div>
          </div>

          {/* Right: stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-xl p-6 hover:bg-primary-foreground/10 transition-colors"
                >
                  <Icon className="h-6 w-6 text-primary mb-3" />
                  <p className="font-serif text-3xl font-bold text-primary-foreground mb-1">{stat.value}</p>
                  <p className="text-sm text-primary-foreground/60">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
