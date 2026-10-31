import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@continent/shared/database.types";

// The site only talks to Supabase from the server. It uses the public (anon / publishable)
// key, so RLS still applies: reads are limited to public data, writes go through
// SECURITY DEFINER RPCs. Falls back to the admin app's VITE_* names so both apps can
// share one set of env vars.
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function supabase() {
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY environment variables");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
