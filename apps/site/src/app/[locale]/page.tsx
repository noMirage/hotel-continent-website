import type { Metadata } from "next";
import { hotelConfig } from "@continent/shared/hotel-config";
import { getMinPrice } from "@continent/shared/room-pricing";
import { hasLocale, localizePath, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/dictionaries";
import { getGuestPrices, getHotelSettings, getRoomTypes } from "@/lib/data";
import { jsonLd, pageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";
import HomeView from "@/views/Home";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getT(locale);
  return pageMetadata({ locale, path: "/", title: `${SITE_NAME} — ${t("hotel.tagline")}`, descriptionKey: "hotel.description" });
}

async function HotelJsonLd({ locale }: { locale: Locale }) {
  const [settings, rooms, prices, t] = await Promise.all([getHotelSettings(), getRoomTypes(), getGuestPrices(), getT(locale)]);
  const minPrice = Math.min(
    ...rooms.map((r) => getMinPrice(prices.filter((p) => p.room_type_id === r.id), Number(r.base_price))),
  );
  const data = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: settings?.hotel_name ?? hotelConfig.name,
    description: t("hotel.description"),
    url: SITE_URL + localizePath("/", locale),
    telephone: settings?.phone ?? hotelConfig.phone,
    email: settings?.email ?? hotelConfig.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: locale === "uk" ? "вул. Сонячна, 59" : "59 Soniachna St.",
      addressLocality: locale === "uk" ? "Поляна" : "Polyana",
      addressRegion: locale === "uk" ? "Закарпатська область" : "Zakarpattia Oblast",
      addressCountry: "UA",
    },
    checkinTime: settings?.check_in_time ?? hotelConfig.checkInTime,
    checkoutTime: settings?.check_out_time ?? hotelConfig.checkOutTime,
    priceRange: Number.isFinite(minPrice) ? `від ${minPrice} UAH` : undefined,
    currenciesAccepted: "UAH",
    sameAs: [hotelConfig.social.facebook, hotelConfig.social.instagram],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />;
}

export default async function Page({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  return (
    <>
      {hasLocale(locale) && <HotelJsonLd locale={locale} />}
      <HomeView />
    </>
  );
}
