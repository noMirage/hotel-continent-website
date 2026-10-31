import { describe, it, expect, beforeEach, vi } from "vitest";

// Set the env var before the module is imported so STORAGE_KEY is derived correctly.
vi.stubEnv("VITE_SUPABASE_URL", "https://abcdefghijkl.supabase.co");

// Import after stubbing env so the module-level STORAGE_KEY picks it up.
const { readStoredSession } = await import("@/hooks/useAdminSession");

const STORAGE_KEY = "sb-abcdefghijkl-auth-token";

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    access_token: "tok_abc",
    refresh_token: "ref_abc",
    token_type: "bearer",
    expires_in: 3600,
    user: { id: "user-1", email: "test@example.com" },
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("readStoredSession", () => {
  it("path 1 — returns null when localStorage has no entry for the key", () => {
    expect(readStoredSession()).toBeNull();
  });

  it("path 2 — returns null when the stored value is not valid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not-json{{");
    expect(readStoredSession()).toBeNull();
  });

  it("path 3a — returns null when access_token is missing", () => {
    const session = makeSession({ access_token: undefined });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(readStoredSession()).toBeNull();
  });

  it("path 3b — returns null when user is missing", () => {
    const session = makeSession({ user: undefined });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(readStoredSession()).toBeNull();
  });

  it("path 4 — returns null when expires_at is within the 10-second rejection window", () => {
    // Expires exactly 5 seconds from now — inside the 10 s guard
    const session = makeSession({ expires_at: Math.floor(Date.now() / 1000) + 5 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(readStoredSession()).toBeNull();
  });

  it("path 4 edge — returns null when expires_at is in the past", () => {
    const session = makeSession({ expires_at: Math.floor(Date.now() / 1000) - 1 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(readStoredSession()).toBeNull();
  });

  it("path 4 edge — accepts a session expiring exactly 11 seconds from now (just outside the window)", () => {
    const session = makeSession({ expires_at: Math.floor(Date.now() / 1000) + 11 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(readStoredSession()).not.toBeNull();
  });

  it("path 5 — returns the parsed session when it is valid and not expired", () => {
    const session = makeSession();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    const result = readStoredSession();
    expect(result).not.toBeNull();
    expect(result?.access_token).toBe("tok_abc");
    expect(result?.user.id).toBe("user-1");
  });

  it("path 5 — treats expires_at = 0 as 'no expiry' and returns the session", () => {
    const session = makeSession({ expires_at: 0 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    expect(readStoredSession()).not.toBeNull();
  });
});
