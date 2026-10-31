import type { Metadata } from "next";
import { hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import LeisureView from "@/views/Leisure";

export async function generateMetadata({ params }: PageProps<"/[locale]/leisure">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return pageMetadata({ locale, path: "/leisure", titleKey: "leisure.title", descriptionKey: "leisure.subtitle" });
}

export default function Page() {
  return <LeisureView />;
}
