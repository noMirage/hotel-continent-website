import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.stubEnv("VITE_SUPABASE_URL", "https://abcdefghijkl.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k, language: "en", setLanguage: vi.fn() }),
}));

const { useAdminLogin } = await import("@/hooks/useAdminLogin");
const { supabase }      = await import("@/integrations/supabase/client");

const BASE = "https://abcdefghijkl.supabase.co";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterAll(()  => server.close());
afterEach(()  => {
  server.resetHandlers();
  mockToast.mockClear();
  vi.restoreAllMocks();
});

function makeUser(id = "user-1") {
  return { id, email: "admin@test.com", aud: "authenticated", role: "authenticated" };
}

describe("useAdminLogin", () => {
  it("success: calls onSuccess with role and shows welcome toast", async () => {
    vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
      data: { user: makeUser() as any, session: {} as any },
      error: null,
    });
    server.use(
      http.get(`${BASE}/rest/v1/user_roles`, () =>
        HttpResponse.json([{ role: "admin" }])
      ),
    );

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAdminLogin({ onSuccess }));

    await act(() => result.current.login("admin@test.com", "password"));

    expect(onSuccess).toHaveBeenCalledWith("admin");
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "adminLogin.welcomeBack" })
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("wrong credentials: shows error toast with error message, does not call onSuccess", async () => {
    vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
      data: { user: null as any, session: null as any },
      error: { message: "Invalid login credentials", name: "AuthApiError", status: 400 } as any,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAdminLogin({ onSuccess }));

    await act(() => result.current.login("bad@test.com", "wrong"));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "adminLogin.loginFailed",
        description: "Invalid login credentials",
        variant: "destructive",
      })
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("no role row — valid user but no authorized role: signs out and shows error toast", async () => {
    vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
      data: { user: makeUser() as any, session: {} as any },
      error: null,
    });
    vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null });
    server.use(
      http.get(`${BASE}/rest/v1/user_roles`, () => HttpResponse.json([])),
    );

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAdminLogin({ onSuccess }));

    await act(() => result.current.login("denied@test.com", "password"));

    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" })
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("role query DB error: shows error toast, does not call onSuccess", async () => {
    vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
      data: { user: makeUser() as any, session: {} as any },
      error: null,
    });
    server.use(
      http.get(`${BASE}/rest/v1/user_roles`, () =>
        HttpResponse.json(
          { message: "permission denied", code: "42501", details: null, hint: null },
          { status: 403 }
        )
      ),
    );

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAdminLogin({ onSuccess }));

    await act(() => result.current.login("admin@test.com", "password"));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" })
    );
  });

  it("isLoading reflects in-flight state: true during login, false after", async () => {
    let resolveSignIn!: (val: any) => void;
    vi.spyOn(supabase.auth, "signInWithPassword").mockReturnValue(
      new Promise((res) => { resolveSignIn = res; })
    );

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAdminLogin({ onSuccess }));

    expect(result.current.isLoading).toBe(false);

    act(() => { result.current.login("admin@test.com", "password"); });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    resolveSignIn({
      data: { user: null as any, session: null as any },
      error: { message: "err", name: "AuthApiError", status: 400 } as any,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
