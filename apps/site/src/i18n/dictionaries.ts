import "server-only";
import type { Locale } from "./config";
import { translate, type Dictionary } from "./translate";

// Generated from the admin translations (only keys the public site uses).
// Regenerate with `npm run i18n:sync -w @continent/site` after editing apps/admin/src/i18n/translations.ts.
const dictionaries = {
  uk: () => import("./dictionaries/uk.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

/** Server-side `t()` for Server Components and metadata. */
export async function getT(locale: Locale) {
  const dict = await getDictionary(locale);
  return (key: string, replacements?: Record<string, string>) => translate(dict, key, replacements);
}
