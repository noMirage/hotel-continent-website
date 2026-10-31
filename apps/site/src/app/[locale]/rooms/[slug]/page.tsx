import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getMinPrice } from "@continent/shared/room-pricing";
import type { RoomType } from "@continent/shared/supabase-types";
import { hasLocale, localizePath, type Locale } from "@/i18n/config";
import { getGuestPrices, getRoomTypes } from "@/lib/data";
import { jsonLd, pageMetadata, SITE_URL } from "@/lib/seo";
import RoomDetailsView from "@/views/RoomDetails";

export async function generateStaticParams() {
  const rooms = await getRoomTypes();
  return rooms.map((r) => ({ slug: r.slug }));
}

function localized(room: RoomType, locale: Locale) {
  return {
    name: (locale === "uk" && room.name_uk) || room.name,
    description: (locale === "uk" && (room.short_description_uk || room.description_uk)) || room.short_description || room.description || "",
  };
}

async function findRoom(slug: string) {
  return (await getRoomTypes()).find((r) => r.slug === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/rooms/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const room = await findRoom(slug);
  if (!hasLocale(locale) || !room) return {};
  const { name, description } = localized(room, locale);
  return pageMetadata({ locale, path: `/rooms/${slug}`, title: name, description });
}

export default async function Page({ params }: PageProps<"/[locale]/rooms/[slug]">) {
  const { locale, slug } = await params;
  const room = await findRoom(slug);
  if (!room || !hasLocale(locale)) notFound();

  const prices = (await getGuestPrices()).filter((p) => p.room_type_id === room.id);
  const { name, description } = localized(room, locale);
  const data = {
    "@context": "https://schema.org",
    "@type": "HotelRoom",
    name,
    description,
    url: SITE_URL + localizePath(`/rooms/${slug}`, locale),
    occupancy: { "@type": "QuantitativeValue", maxValue: room.max_guests },
    ...(room.size_sqm ? { floorSize: { "@type": "QuantitativeValue", value: room.size_sqm, unitCode: "MTK" } } : {}),
    ...(room.bed_type ? { bed: room.bed_type } : {}),
    amenityFeature: ((locale === "uk" && room.amenities_uk?.length ? room.amenities_uk : room.amenities) ?? []).map((a) => ({
      "@type": "LocationFeatureSpecification", name: a, value: true,
    })),
    offers: {
      "@type": "Offer",
      price: getMinPrice(prices, Number(room.base_price)),
      priceCurrency: "UAH",
      unitText: "night",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
      {/* RoomDetails reads ?checkIn/&checkOut from the URL (useSearchParams) */}
      <Suspense>
        <RoomDetailsView slug={slug} />
      </Suspense>
    </>
  );
}
