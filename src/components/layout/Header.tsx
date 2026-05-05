import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { phone: hotelPhone } = useHotelSettings();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/rooms", label: t("nav.rooms") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
    { href: "/leisure", label: t("nav.leisure") },
  ];

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "uk" : "en");
  };
  
  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isHome && !scrolled && !isMenuOpen
        ? "bg-gradient-to-b from-black/50 to-transparent border-transparent"
        : "bg-card/95 backdrop-blur-sm border-b border-border"
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/continent-logo.svg"
              alt="Hotel Continent"
              className="h-16 w-auto"
            />
            <span className="sr-only">Hotel Continent</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isHome && !scrolled
                    ? location.pathname === link.href ? "text-white" : "text-white/80 hover:text-white"
                    : location.pathname === link.href ? "text-primary" : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          
          {/* CTA, Language & Contact */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-sm px-2 py-1 rounded-md hover:bg-accent transition-colors"
              aria-label="Switch language"
              title={language === "en" ? "Switch to Ukrainian" : "Switch to English"}
            >
              <span className={cn("font-semibold transition-colors", isHome && !scrolled ? (language === "en" ? "text-white" : "text-white/60") : (language === "en" ? "text-primary" : "text-muted-foreground"))}>EN</span>
              <span className={isHome && !scrolled ? "text-white/30" : "text-muted-foreground/40"}>|</span>
              <span className={cn("font-semibold transition-colors", isHome && !scrolled ? (language === "uk" ? "text-white" : "text-white/60") : (language === "uk" ? "text-primary" : "text-muted-foreground"))}>УК</span>
            </button>
            <a
              href={`tel:${hotelPhone}`}
              className={cn(
              "flex items-center gap-2 text-sm transition-colors",
              isHome && !scrolled ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"
            )}
            >
              <Phone className="h-4 w-4" />
              <span>{hotelPhone}</span>
            </a>
            <Button asChild>
              <Link to="/rooms">{t("nav.bookNow")}</Link>
            </Button>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 p-2 text-sm rounded-md hover:bg-accent transition-colors"
              aria-label="Switch language"
            >
              <span className={`font-semibold text-xs ${language === "en" ? "text-primary" : "text-muted-foreground"}`}>EN</span>
              <span className="text-muted-foreground/40 text-xs">|</span>
              <span className={`font-semibold text-xs ${language === "uk" ? "text-primary" : "text-muted-foreground"}`}>УК</span>
            </button>
            <button
              className="p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "text-base font-medium transition-colors",
                    location.pathname === link.href
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild className="mt-2">
                <Link to="/rooms" onClick={() => setIsMenuOpen(false)}>
                  {t("nav.bookNow")}
                </Link>
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
