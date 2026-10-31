import type { Metadata } from "next";
import { hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import ContactView from "@/views/Contact";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return pageMetadata({ locale, path: "/contact", titleKey: "contact.title", descriptionKey: "contact.description" });
}

export default function Page() {
  return <ContactView />;
}
