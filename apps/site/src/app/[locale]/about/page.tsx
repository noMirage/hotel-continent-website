import type { Metadata } from "next";
import { hasLocale } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import AboutView from "@/views/About";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return pageMetadata({ locale, path: "/about", titleKey: "footer.aboutUs", descriptionKey: "about.storyHeading" });
}

export default function Page() {
  return <AboutView />;
}
