import "server-only";
import type { Metadata } from "next";
import { alternatesFor, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/dictionaries";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hotel-continent.com";
export const SITE_NAME = "Hotel Continent";

interface PageMeta {
  locale: Locale;
  /** Locale-less path, e.g. `/rooms`. */
  path: string;
  titleKey?: string;
  title?: string;
  descriptionKey?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
}

/** Title, description, canonical + hreflang alternates and Open Graph for one page. */
export async function pageMetadata({ locale, path, titleKey, title, descriptionKey, description, image, noindex }: PageMeta): Promise<Metadata> {
  const t = await getT(locale);
  const resolvedTitle = title ?? (titleKey ? t(titleKey) : undefined);
  const resolvedDescription = description ?? (descriptionKey ? t(descriptionKey) : t("hotel.description"));
  const alternates = alternatesFor(path, locale);
  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: locale === "uk" ? "uk_UA" : "en_US",
      url: alternates.canonical,
      title: resolvedTitle ?? SITE_NAME,
      description: resolvedDescription,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** `<script type="application/ld+json">` payload; escapes `<` so content cannot close the tag. */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
