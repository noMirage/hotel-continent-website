"use client";

import { Home, BedDouble, Search, Info, UtensilsCrossed, Phone } from "lucide-react";
import { MenuBar } from "@/components/ui/bottom-menu";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLocation } from "@/i18n/navigation";
import { localizePath } from "@/i18n/config";

export function MobileNav() {
  const location = useLocation();
  const { t, language } = useLanguage();
  const href = (path: string) => localizePath(path, language);

  const items = [
    { icon: <Home className="w-5 h-5" />,            label: t("nav.home"),    href: href("/") },
    { icon: <BedDouble className="w-5 h-5" />,       label: t("nav.rooms"),   href: href("/rooms") },
    { icon: <Search className="w-5 h-5" />,          label: t("nav.search"),  href: href("/#search") },
    { icon: <Info className="w-5 h-5" />,            label: t("nav.about"),   href: href("/about") },
    { icon: <UtensilsCrossed className="w-5 h-5" />, label: t("nav.banquet"), href: href("/banquet") },
    { icon: <Phone className="w-5 h-5" />,           label: t("nav.contact"), href: href("/contact") },
  ];

  return <MenuBar items={items} activeHref={href(location.pathname) + location.hash} homeHref={href("/")} />;
}
