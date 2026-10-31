"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { localizePath, stripLocale, type Locale } from "./config";
import { translate, type Dictionary } from "./translate";

interface LanguageContextValue {
  language: Locale;
  dict: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Receives only the current locale's dictionary from the server layout. */
export function LanguageProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  const value = useMemo(() => ({ language: locale, dict }), [locale, dict]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** Same API as the admin app's `useLanguage()`, but the language comes from the URL. */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  const { language, dict } = ctx;
  const router = useRouter();
  const pathname = usePathname();

  const t = useCallback(
    (key: string, replacements?: Record<string, string>) => translate(dict, key, replacements),
    [dict],
  );

  const setLanguage = useCallback(
    (lang: Locale) => {
      const { path } = stripLocale(pathname);
      router.push(localizePath(path + window.location.search + window.location.hash, lang));
    },
    [pathname, router],
  );

  return { language, setLanguage, t };
}
