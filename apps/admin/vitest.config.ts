import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  envDir: path.resolve(__dirname, "../.."),
  plugins: [react()],
  test: {
    // The Supabase client is created at import time; without a root .env (CI, fresh clone)
    // createClient() throws "supabaseKey is required". Tests mock every request anyway.
    env: {
      VITE_SUPABASE_URL: "https://abcdefghijkl.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
