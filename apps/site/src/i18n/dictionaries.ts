import "server-only";
import type { Locale } from "./config";
import { translate, type Dictionary } from "./translate";

// The site owns its dictionaries: edit src/i18n/dictionaries/{uk,en}.json directly (both
// files must have the same keys — dictionaries.test.ts checks that).
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
