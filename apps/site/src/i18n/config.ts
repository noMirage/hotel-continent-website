export const locales = ["uk", "en"] as const;
export type Locale = (typeof locales)[number];

/** Ukrainian is served without a prefix (`/rooms`), English under `/en` (`/en/rooms`). */
export const defaultLocale: Locale = "uk";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Public URL of an internal path (`/rooms`, `/#search`, `/rooms?x=1`) in the given locale. */
export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path; // external, mailto:, tel:, #hash
  if (locale === defaultLocale) return path;
  const cut = path.search(/[?#]/);
  const pathname = cut === -1 ? path : path.slice(0, cut);
  const rest = cut === -1 ? "" : path.slice(cut);
  return (pathname === "/" ? "/en" : `/en${pathname}`) + rest;
}

/** Splits a pathname into its locale and the locale-less path. Accepts both public (`/en/rooms`) and internal (`/uk/rooms`) forms. */
export function stripLocale(pathname: string): { locale: Locale; path: string } {
  const match = pathname.match(/^\/(uk|en)(?=\/|$)/);
  if (!match) return { locale: defaultLocale, path: pathname || "/" };
  return { locale: match[1] as Locale, path: pathname.slice(match[0].length) || "/" };
}

/** Canonical + hreflang alternates for a locale-less path, for `generateMetadata`. */
export function alternatesFor(path: string, locale: Locale) {
  return {
    canonical: localizePath(path, locale),
    languages: {
      uk: localizePath(path, "uk"),
      en: localizePath(path, "en"),
      "x-default": localizePath(path, defaultLocale),
    },
  };
}
