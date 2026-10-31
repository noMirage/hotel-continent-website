"use client";

// Locale-aware replacements for the react-router APIs the ported components use,
// so `<Link to="/rooms">` keeps working and points at `/en/rooms` on the English site.

import { forwardRef, useCallback, useEffect, useState, type ComponentProps } from "react";
import NextLink from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import { localizePath, stripLocale } from "./config";
import { useLanguage } from "./LanguageContext";

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & { to?: string; href?: string };

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, href, ...rest }, ref) {
  const { language } = useLanguage();
  return <NextLink ref={ref} href={localizePath(to ?? href ?? "/", language)} {...rest} />;
});

export function useNavigate() {
  const router = useRouter();
  const { language } = useLanguage();
  return useCallback((to: string) => router.push(localizePath(to, language)), [router, language]);
}

/** `pathname` is locale-less (`/rooms` on both `/rooms` and `/en/rooms`). */
export function useLocation() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [pathname]);
  return { pathname: stripLocale(pathname).path, hash };
}

/** react-router shape: `const [params] = useSearchParams()`. Needs a <Suspense> boundary above it. */
export function useSearchParams() {
  return [useNextSearchParams()] as const;
}
