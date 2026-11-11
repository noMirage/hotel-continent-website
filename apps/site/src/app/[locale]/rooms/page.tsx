import type { Metadata } from "next";
import { hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import RoomsView from "@/views/Rooms";

export async function generateMetadata({ params }: PageProps<"/[locale]/rooms">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return pageMetadata({ locale, path: "/rooms", titleKey: "rooms.title", descriptionKey: "featured.subtitle" });
}

export default function Page() {
  return <RoomsView />;
}
