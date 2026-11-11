import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@continent/shared/database.types";

// The site only talks to Supabase from the server. Falls back to the admin app's VITE_*
// names so both apps can share one set of env vars.
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Read client. Uses the public (publishable) key, so RLS applies: only public data is visible. */
export function supabase() {
  if (!url || !publishableKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY environment variables");
  }
  return createClient<Database>(url, publishableKey, options);
}

/**
 * Write client for the public-form RPCs (create_public_booking, submit_*). Those functions
 * are executable only by service_role (migration 20261110000001): with the public key anyone
 * could call them directly from a script and skip BotID and the Vercel rate limit.
 *
 * The secret key bypasses RLS — use it ONLY in app/actions.ts for those RPC calls, never for
 * reads or table access.
 */
export function supabaseWriter() {
  if (!url || !secretKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY environment variables");
  }
  return createClient<Database>(url, secretKey, options);
}
