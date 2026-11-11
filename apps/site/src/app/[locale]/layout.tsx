import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { Toaster } from "sonner";
import "../fonts.css";
import "../globals.css";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary, getT } from "@/i18n/dictionaries";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { getCurrentYear, getSiteData } from "@/lib/data";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SiteDataProvider } from "@/components/providers/SiteDataProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";

// Self-hosted fonts (src/app/fonts.css). Preload the subset the locale renders first.
function preloadFonts(locale: string) {
  const subset = locale === "uk" ? "cyrillic" : "latin";
  for (const file of [`jost-normal-${subset}`, `cormorant-garamond-normal-${subset}`]) {
    preload(`/fonts/${file}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getT(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${SITE_NAME} — ${t("hotel.tagline")}`, template: `%s · ${SITE_NAME}` },
    description: t("hotel.description"),
    applicationName: SITE_NAME,
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#bf6e00",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  preloadFonts(locale);

  const [dict, siteData, year] = await Promise.all([getDictionary(locale), getSiteData(), getCurrentYear()]);

  return (
    <html lang={locale}>
      <body>
        <QueryProvider>
          <LanguageProvider locale={locale} dict={dict}>
            <SiteDataProvider data={siteData}>
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 pt-16 md:pt-20 pb-20 md:pb-0">{children}</main>
                <Footer year={year} />
                <MobileNav />
              </div>
              <Toaster richColors position="top-center" />
            </SiteDataProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
