import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Facebook, Instagram } from "lucide-react";
import { hotelConfig } from "@/config/hotel";
import { useLanguage } from "@/i18n/LanguageContext";
import { useHotelSettings } from "@/hooks/useHotelSettings";

export function Footer() {
  const { t, language } = useLanguage();
  const { data: hotelSettings, phone, email, checkInTime, address: enAddress } = useHotelSettings();

  const address = language === "uk" && hotelSettings?.address_uk
    ? hotelSettings.address_uk
    : enAddress;

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <img src="/continent-logo.svg" alt="Hotel Continent" className="h-10 w-auto" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("hotel.description")}
            </p>
            <div className="flex gap-4">
              <a href={hotelConfig.social.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href={hotelConfig.social.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("footer.quickLinks")}</h4>
            <ul className="space-y-2">
              <li><Link to="/rooms" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.ourRooms")}</Link></li>
              <li><Link to="/leisure" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.leisure")}</Link></li>
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.aboutUs")}</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.contact")}</Link></li>
              <li>
                <Link to="/admin" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.adminLogin")}</Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("footer.policies")}</h4>
            <ul className="space-y-2">
              <li><span className="text-sm text-muted-foreground">{t("footer.checkIn")}: {checkInTime}</span></li>
              <li><span className="text-sm text-muted-foreground">{t("footer.checkOut")}: {hotelConfig.checkOutTime}</span></li>
              <li><Link to="/policies" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.termsConditions")}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("footer.contactUs")}</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <a href={`tel:${phone}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <a href={`mailto:${email}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Hotel Continent. {t("footer.allRights")}
          </p>
          <p className="text-center text-xs text-muted-foreground/60 mt-1">
            Developed by noMirage
          </p>
        </div>
      </div>
    </footer>
  );
}
