import type { MetadataRoute } from "next";
import { localizePath, locales } from "@/i18n/config";
import { getRoomTypes } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";

const STATIC_PATHS = ["/", "/rooms", "/about", "/contact", "/leisure", "/banquet", "/policies"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rooms = await getRoomTypes();
  const paths = [...STATIC_PATHS, ...rooms.map((r) => `/rooms/${r.slug}`)];

  return paths.map((path) => ({
    url: SITE_URL + localizePath(path, "uk"),
    changeFrequency: path.startsWith("/rooms") || path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/rooms") ? 0.8 : 0.6,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, SITE_URL + localizePath(path, l)])),
    },
  }));
}
