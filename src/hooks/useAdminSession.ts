import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/supabase-types";

// Derive the same key supabase-js uses: sb-{projectRef}-auth-token
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PROJECT_REF  = new URL(SUPABASE_URL).hostname.split(".")[0];
const STORAGE_KEY  = `sb-${PROJECT_REF}-auth-token`;

/**
 * Read the stored session from localStorage synchronously.
 * Returns null if absent, unparseable, or clearly expired.
 * Used in tests; the hook no longer uses this to initialise isLoading
 * because an optimistic render would briefly expose admin content to
 * users whose session has been server-side revoked.
 */
export function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session & { expires_at?: number };
    if (!parsed?.access_token || !parsed?.user) return null;
    // Reject if the token expires in the next 10 seconds
    const expiresAt = parsed.expires_at ?? 0;
    if (expiresAt > 0 && expiresAt < Date.now() / 1000 + 10) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function fetchAdminRole(userId: string): Promise<AppRole | null> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin", "viewer", "owner"])
    .maybeSingle();
  return (data?.role as AppRole) ?? null;
}

export function useAdminSession() {
  // Always start in loading state so AdminLayout never renders admin content
  // before the server confirms the session is valid. A revoked or expired
  // token in localStorage would otherwise briefly expose the admin UI.
  const [session, setSession]       = useState<Session | null>(null);
  const [role, setRole]             = useState<AppRole | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session: verified } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (verified) {
        setSession(verified);
        const r = await fetchAdminRole(verified.user.id);
        if (mounted) {
          setRole(r);
          setIsRoleLoading(false);
        }
      } else {
        // Token was absent or expired — clear the optimistic session
        setSession(null);
        setIsRoleLoading(false);
      }

      if (mounted) setIsLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && newSession) {
        setSession(newSession);
        // Only re-fetch the role on actual sign-in, not on every token refresh
        if (event === "SIGNED_IN") {
          const r = await fetchAdminRole(newSession.user.id);
          if (mounted) {
            setRole(r);
            setIsRoleLoading(false);
          }
        }
      }
      if (event === "SIGNED_OUT") {
        setSession(null);
        setRole(null);
        setIsRoleLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, role, isLoading, isRoleLoading };
}
