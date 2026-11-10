import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // *.timestamp-*.mjs: transient files Vite writes next to vitest.config.ts while loading it.
  // Lint and test run in parallel under turbo, so ESLint must not try to read them.
  globalIgnores([".next/**", "next-env.d.ts", "scripts/**", "**/*.timestamp-*.mjs"]),
  {
    rules: {
      // Components were ported from the admin app; tighten this once they are cleaned up.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);
