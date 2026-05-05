import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

export function CTASection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-24 bg-primary">
      <div className="container mx-auto px-4 text-center">
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          {t("cta.title")}
        </h2>
        <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
          {t("cta.subtitle")} Hotel Continent.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="secondary" asChild className="text-base px-8">
            <Link to="/rooms">{t("cta.bookStay")}</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="text-base px-8 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Link to="/contact">{t("cta.contactUs")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
