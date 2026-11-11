import path from "node:path";
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { withBotId } from "botid/next/config";

// .env files live at the monorepo root, shared with the admin app. Next has already loaded
// (and cached) env from apps/site by the time this runs, so force a reload from the root.
loadEnvConfig(path.resolve(__dirname, "../.."), process.env.NODE_ENV !== "production", undefined, true);

// Applied to every response. The site never needs to be framed; a CSP with script sources
// would need nonces for Next's inline scripts, so only frame-ancestors is set here.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  transpilePackages: ["@continent/shared"],
  // Ukrainian lives at unprefixed URLs (/rooms) and is served by the app/[locale] routes as
  // /uk/rooms; English is /en/rooms. Done with config rewrites (resolved by the router, no
  // function invocation per request) rather than a proxy.
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/fonts/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
  async redirects() {
    return [
      { source: "/uk", destination: "/", permanent: true },
      { source: "/uk/:path*", destination: "/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/uk" },
        // everything except /en, /uk, /api, Next internals and files with an extension
        {
          source: "/:path((?!en(?:/|$)|uk(?:/|$)|api(?:/|$)|_next(?:/|$)|.*\\.[a-zA-Z0-9]+$).+)",
          destination: "/uk/:path",
        },
      ],
    };
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Room photos are raster uploads; SVG is never served through the optimizer.
    dangerouslyAllowSVG: false,
    remotePatterns: [
      // Room photos uploaded from the admin panel (Supabase Storage, public bucket)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default withBotId(nextConfig);
