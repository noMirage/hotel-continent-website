import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { renderHook, waitFor } from "@testing-library/react";

// Must happen before the modules below are imported so STORAGE_KEY and the
// supabase client are both initialised with the test URL.
vi.stubEnv("VITE_SUPABASE_URL", "https://abcdefghijkl.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

const { useAdminSession } = await import("@/hooks/useAdminSession");
const { supabase }        = await import("@/integrations/supabase/client");

const BASE        = "https://abcdefghijkl.supabase.co";
const STORAGE_KEY = "sb-abcdefghijkl-auth-token";

// ── MSW server ───────────────────────────────────────────────────────────────
// Intercepts the PostgREST user_roles query that fetchAdminRole() fires.
// postgrest-js maybeSingle() on GET: returns array → unwraps to [0] or null.
const server = setupServer();
beforeAll(() =>  server.listen({ onUnhandledRequest: "warn" }));
afterAll(()  =>  server.close());
afterEach(()  => {
  server.resetHandlers();
  localStorage.clear();
  vi.restoreAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    access_token:  "tok_test",
    refresh_token: "ref_test",
    token_type:    "bearer",
    expires_in:    3600,
    expires_at:    Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: "user-1", email: "admin@test.com",
      aud: "authenticated", role: "authenticated",
      app_metadata: {}, user_metadata: {},
      created_at: new Date().toISOString(),
    },
    ...overrides,
  };
}

/** Spy on auth SDK methods so tests control what getSession() returns
 *  without relying on supabase-js's internal localStorage parsing or
 *  triggering token-refresh HTTP calls. */
function mockAuth(session: ReturnType<typeof makeSession> | null) {
  vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
    data: { session: session as any },
    error: null,
  });
  vi.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as any);
}

/** MSW handler: user_roles returns a matching role (1-element array). */
function withRole(role: string) {
  return http.get(`${BASE}/rest/v1/user_roles`, () =>
    HttpResponse.json([{ role }])
  );
}

/** MSW handler: user_roles returns no matching role (empty array). */
function withNoRole() {
  return http.get(`${BASE}/rest/v1/user_roles`, () =>
    HttpResponse.json([])
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useAdminSession", () => {
  it("cold start — no cache, no session: isLoading starts true, settles to null session + null role", async () => {
    mockAuth(null);
    // No localStorage entry — readStoredSession() returns null

    const { result } = renderHook(() => useAdminSession());

    // Synchronous initial state: no stored session → skeleton shown
    expect(result.current.isLoading).toBe(true);
    expect(result.current.session).toBeNull();
    expect(result.current.role).toBeNull();

    // After async init() resolves
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.isRoleLoading).toBe(false);
  });

  it("warm cache — valid localStorage: session and role resolve after async verify", async () => {
    const session = makeSession();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    mockAuth(session);
    server.use(withRole("admin"));

    const { result } = renderHook(() => useAdminSession());

    // Synchronous initial state: always starts loading so admin content is
    // never briefly exposed to a user whose session was server-side revoked.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.session).toBeNull();
    expect(result.current.role).toBeNull();

    // After async verify + role fetch
    await waitFor(() => expect(result.current.isRoleLoading).toBe(false));
    expect(result.current.role).toBe("admin");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).not.toBeNull();
  });

  it("invalid token — stale cache but server rejects: session stays null after verify", async () => {
    const session = makeSession();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    mockAuth(null); // server rejects

    const { result } = renderHook(() => useAdminSession());

    // Always starts loading/null regardless of what is in localStorage
    expect(result.current.isLoading).toBe(true);
    expect(result.current.session).toBeNull();

    // After async verify: server rejected, so everything stays null
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.isRoleLoading).toBe(false);
  });

  it("expired token — readStoredSession rejects it synchronously: isLoading starts true, settles null", async () => {
    // expires_at is in the past — readStoredSession's expiry guard returns null.
    const expired = makeSession({ expires_at: Math.floor(Date.now() / 1000) - 60 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expired));
    mockAuth(null);

    const { result } = renderHook(() => useAdminSession());

    // Synchronous: readStoredSession rejected the expired token → skeleton shown
    expect(result.current.isLoading).toBe(true);
    expect(result.current.session).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.isRoleLoading).toBe(false);
  });

  it("missing role — valid session but no matching row in user_roles: role stays null", async () => {
    const session = makeSession();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    mockAuth(session);
    server.use(withNoRole()); // DB has no matching role for this user

    const { result } = renderHook(() => useAdminSession());

    // Always starts loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isRoleLoading).toBe(false));
    expect(result.current.session).not.toBeNull();
    expect(result.current.role).toBeNull(); // fetchAdminRole returned null
    expect(result.current.isLoading).toBe(false);
  });
});
