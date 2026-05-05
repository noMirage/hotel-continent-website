import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Calendar, Mail, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hotelConfig } from "@/config/hotel";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";

export default function BookingConfirmationPage() {
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { hotelName } = useHotelSettings();
  const dateLocale = language === "uk" ? ukLocale : enUS;

  const room = searchParams.get("room") || "Your Room";
  const checkInRaw  = searchParams.get("checkIn")  || "";
  const checkOutRaw = searchParams.get("checkOut") || "";
  const total = searchParams.get("total") || "0";

  const formatDate = (raw: string) => {
    try {
      return format(parseISO(raw), "dd MMM yyyy", { locale: dateLocale });
    } catch {
      return raw;
    }
  };

  const checkIn  = checkInRaw  ? formatDate(checkInRaw)  : "";
  const checkOut = checkOutRaw ? formatDate(checkOutRaw) : "";
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="text-center">
          <CardContent className="p-8 md:p-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("booking.submitted")}
            </h1>
            
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {t("booking.thankYou")} {hotelName}. {t("booking.received")}
            </p>
            
            <div className="bg-muted/50 rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-foreground mb-4">{t("booking.details")}</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("booking.room")}</span>
                  <span className="font-medium text-foreground">{room}</span>
                </div>
                {checkIn && checkOut && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("booking.dates")}</span>
                    <span className="font-medium text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {checkIn} - {checkOut}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-border">
                  <span className="font-semibold text-foreground">{t("booking.total")}</span>
                  <span className="font-bold text-primary text-lg">
                    {hotelConfig.currencySymbol}{total}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-accent/50 rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                {t("booking.whatsNext")}
              </h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• {t("booking.confirmEmail")}</li>
                <li>• {t("booking.paymentInstructions")}</li>
                <li>• {t("booking.contactQuestions")}</li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/" className="gap-2">
                  {t("booking.returnHome")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contact">{t("cta.contactUs")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
