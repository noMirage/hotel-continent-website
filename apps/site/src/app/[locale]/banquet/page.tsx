import type { Metadata } from "next";
import { hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import BanquetView from "@/views/Banquet";

export async function generateMetadata({ params }: PageProps<"/[locale]/banquet">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return pageMetadata({ locale, path: "/banquet", titleKey: "banquet.hero.title", descriptionKey: "banquet.hero.subtitle" });
}

export default function Page() {
  return <BanquetView />;
}
