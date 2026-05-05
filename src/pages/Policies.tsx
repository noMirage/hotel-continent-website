import { hotelConfig } from "@/config/hotel";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";

export default function PoliciesPage() {
  const { t } = useLanguage();
  const { checkInTime } = useHotelSettings();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative h-[30vh] min-h-[200px] flex items-center justify-center bg-card">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/30" />
        <div className="relative container mx-auto px-4 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("policies.title")}
          </h1>
        </div>
      </section>
      
      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-12">
            <div>
              <h2 className="font-serif text-2xl font-bold text-foreground mb-4">{t("policies.checkInOut")}</h2>
              <div className="prose max-w-none text-muted-foreground">
                <ul className="space-y-2">
                  <li>{t("policies.checkInTime")}: {checkInTime}</li>
                  <li>{t("policies.checkOutTime")}: {hotelConfig.checkOutTime}</li>
                  <li>{t("policies.earlyLate")}</li>
                  <li>{t("policies.validId")}</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h2 className="font-serif text-2xl font-bold text-foreground mb-4">{t("policies.cancellation")}</h2>
              <div className="prose max-w-none text-muted-foreground">
                <ul className="space-y-2">
                  <li>{t("policies.cancel48")}</li>
                  <li>{t("policies.cancelLate")}</li>
                  <li>{t("policies.noShow")}</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h2 className="font-serif text-2xl font-bold text-foreground mb-4">{t("policies.payment")}</h2>
              <div className="prose max-w-none text-muted-foreground">
                <ul className="space-y-2">
                  <li>{t("policies.creditCards")}</li>
                  <li>{t("policies.paymentRequired")}</li>
                  <li>{t("policies.deposit")}</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h2 className="font-serif text-2xl font-bold text-foreground mb-4">{t("policies.houseRules")}</h2>
              <div className="prose max-w-none text-muted-foreground">
                <ul className="space-y-2">
                  <li>{t("policies.noSmoking")}</li>
                  <li>{t("policies.noPets")}</li>
                  <li>{t("policies.quietHours")}</li>
                  <li>{t("policies.noOutside")}</li>
                  <li>{t("policies.childrenFree")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
