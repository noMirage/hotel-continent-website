import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "next-env.d.ts", "scripts/**"]),
  {
    rules: {
      // Components were ported from the admin app; tighten this once they are cleaned up.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);
