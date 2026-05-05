import React from "react";
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QK } from "@/lib/queryKeys";
import type { CheckInInput, GuestFormEntry } from "@/hooks/useGuestFormMutation";

vi.stubEnv("VITE_SUPABASE_URL", "https://abcdefghijkl.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k, language: "en", setLanguage: vi.fn() }),
}));

const { useGuestFormMutation } = await import("@/hooks/useGuestFormMutation");
const { supabase }             = await import("@/integrations/supabase/client");

const BASE = "https://abcdefghijkl.supabase.co";

// ── MSW ──────────────────────────────────────────────────────────────────────
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterAll(()  => server.close());

// ── Per-test state ────────────────────────────────────────────────────────────
let queryClient:  QueryClient;
let onSaveSuccess: ReturnType<typeof vi.fn>;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  vi.spyOn(queryClient, "invalidateQueries");
  onSaveSuccess = vi.fn();
});

afterEach(() => {
  server.resetHandlers();
  mockToast.mockClear();
  vi.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = queryClient;
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function useHook() {
  return useGuestFormMutation({ onSaveSuccess });
}

function makeForm(overrides: Partial<GuestFormEntry> = {}): GuestFormEntry {
  return {
    full_name:               "Test Guest",
    date_of_birth:           "1990-01-01",
    country_of_residence:    "UA",
    region:                  "",
    district:                "",
    village_city:            "Kyiv",
    street_house_apartment:  "",
    passport_series:         "AA123456",
    issued_by:               "",
    ubk:                     "",
    phone_number:            "",
    vehicle_number:          "",
    ...overrides,
  };
}

const BASE_INPUT: Omit<CheckInInput, "forms" | "isEditMode" | "existingFormId"> = {
  reservationId:         "res-1",
  reservationTotalPrice: 500,
  reservationCheckIn:    "2025-06-01",
  reservationCheckOut:   "2025-06-03",  // 2 nights
  reservationTouristTax: 20,
  ttRate:                5,
};

const CREATE_NO_UBD: CheckInInput = {
  ...BASE_INPUT,
  forms:          [makeForm({ ubk: "" })],
  isEditMode:     false,
  existingFormId: undefined,
};

// ubk filled → 20% discount on total_price + tax reduction applied
const CREATE_WITH_UBD: CheckInInput = {
  ...BASE_INPUT,
  forms:          [makeForm({ ubk: "UA123456" })],
  isEditMode:     false,
  existingFormId: undefined,
};

// Edit path: skips INSERT + reservations PATCH entirely
const EDIT: CheckInInput = {
  ...BASE_INPUT,
  forms:          [makeForm()],
  isEditMode:     true,
  existingFormId: "form-1",
};

/** All 4 keys invalidated on every success path. */
function expectInvalidated() {
  expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(4);
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminBookings() });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminCalendarReservations() });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.dashboard() });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.guestForm() });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useGuestFormMutation", () => {
  describe("checkInMutation — create mode, no UBD", () => {
    it("invalidates 4 query keys, shows successDesc toast, calls onSaveSuccess", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      // INSERT guest_forms → 201, then PATCH reservations → 204
      server.use(
        http.post(`${BASE}/rest/v1/guest_forms`,   () => new HttpResponse(null, { status: 201 })),
        http.patch(`${BASE}/rest/v1/reservations`, () => new HttpResponse(null, { status: 204 })),
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.checkInMutation.mutate(CREATE_NO_UBD);

      await waitFor(() => expect(onSaveSuccess).toHaveBeenCalledOnce());

      expectInvalidated();
      expect(mockToast).toHaveBeenCalledOnce();
      expect(mockToast).toHaveBeenCalledWith({
        title:       "guestForm.success",
        description: "guestForm.successDesc",
      });
    });
  });

  describe("checkInMutation — create mode, UBD filled", () => {
    it("invalidates 4 query keys, shows discountApplied toast, calls onSaveSuccess", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      server.use(
        http.post(`${BASE}/rest/v1/guest_forms`,   () => new HttpResponse(null, { status: 201 })),
        http.patch(`${BASE}/rest/v1/reservations`, () => new HttpResponse(null, { status: 204 })),
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.checkInMutation.mutate(CREATE_WITH_UBD);

      await waitFor(() => expect(onSaveSuccess).toHaveBeenCalledOnce());

      expectInvalidated();
      expect(mockToast).toHaveBeenCalledOnce();
      expect(mockToast).toHaveBeenCalledWith({
        title:       "guestForm.success",
        description: "guestForm.discountApplied",   // ubdFilled=true branch
      });
    });
  });

  describe("checkInMutation — edit mode", () => {
    it("invalidates 4 query keys, shows editedDesc toast, calls onSaveSuccess", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      // Only a PATCH to guest_forms; no INSERT, no reservations PATCH
      server.use(
        http.patch(`${BASE}/rest/v1/guest_forms`, () => new HttpResponse(null, { status: 204 })),
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.checkInMutation.mutate(EDIT);

      await waitFor(() => expect(onSaveSuccess).toHaveBeenCalledOnce());

      expectInvalidated();
      expect(mockToast).toHaveBeenCalledOnce();
      expect(mockToast).toHaveBeenCalledWith({
        title:       "guestForm.edited",
        description: "guestForm.editedDesc",         // isEdit=true branch
      });
    });
  });

  describe("checkInMutation — DB error", () => {
    it("shows destructive toast, does not call onSaveSuccess, does not invalidate", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      // Fail on INSERT — error is caught and a fixed message shown (not e.message)
      server.use(
        http.post(`${BASE}/rest/v1/guest_forms`, () =>
          HttpResponse.json(
            { message: "DB error", code: "XXXX", details: null, hint: null },
            { status: 400 },
          )
        ),
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.checkInMutation.mutate(CREATE_NO_UBD);

      await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
      expect(mockToast).toHaveBeenCalledWith({
        title:       "common.error",
        description: "common.unexpectedError",   // hook uses fixed key, not e.message
        variant:     "destructive",
      });
      expect(onSaveSuccess).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
