import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Preview deployments and the client demo (SITE_NOINDEX=1) must not be indexed.
  if ((process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") || process.env.SITE_NOINDEX === "1") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/booking-confirmation", "/en/booking-confirmation"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
