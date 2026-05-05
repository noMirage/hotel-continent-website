import React from "react";
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QK } from "@/lib/queryKeys";

// Stub env before anything that reads VITE_SUPABASE_URL is imported.
vi.stubEnv("VITE_SUPABASE_URL", "https://abcdefghijkl.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

// vi.hoisted ensures these refs are defined before vi.mock factory closures run.
const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// t(key) → key so assertions can use the translation key strings directly.
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k, language: "en", setLanguage: vi.fn() }),
}));

const { useCalendarBookingMutation } = await import("@/hooks/useCalendarBookingMutation");
const { supabase }                    = await import("@/integrations/supabase/client");

const BASE = "https://abcdefghijkl.supabase.co";

// ── MSW — intercepts PostgREST calls ─────────────────────────────────────────
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterAll(()  => server.close());

// ── Per-test state ────────────────────────────────────────────────────────────
let queryClient:    QueryClient;
let onStatusSuccess:  ReturnType<typeof vi.fn>;
let onDetailsSuccess: ReturnType<typeof vi.fn>;
let onDeleteSuccess:  ReturnType<typeof vi.fn>;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  vi.spyOn(queryClient, "invalidateQueries");
  onStatusSuccess  = vi.fn();
  onDetailsSuccess = vi.fn();
  onDeleteSuccess  = vi.fn();
});

afterEach(() => {
  server.resetHandlers();
  mockToast.mockClear();
  vi.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wraps the hook in a QueryClientProvider bound to the current queryClient. */
function makeWrapper() {
  const qc = queryClient;
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function useHook() {
  return useCalendarBookingMutation({ onStatusSuccess, onDetailsSuccess, onDeleteSuccess });
}

/** Verifies the shared invalidate() helper fired for exactly the 3 expected keys. */
function expectInvalidated() {
  expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminBookings() });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminCalendarReservations() });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.dashboard() });
}

// ── Shared inputs ─────────────────────────────────────────────────────────────

const STATUS_INPUT = {
  reservationId: "res-1",
  currentStatus: "UNPROCESSED" as const,
  status:        "PENDING"     as const,
};

// Same room + same dates → no availability / fee-conflict checks → single PATCH.
const DETAILS_INPUT = {
  reservationId:     "res-1",
  originalRoomUnitId: "unit-1",
  originalCheckIn:   "2025-06-01",
  originalCheckOut:  "2025-06-05",
  roomUnitId:        "unit-1",
  guestName:         "John Doe",
  guestEmail:        "john@test.com",
  guestPhone:        "",
  numGuests:         2,
  checkIn:           new Date("2025-06-01"),
  checkOut:          new Date("2025-06-05"),
  specialRequests:   "",
  adminNotes:        "",
  earlyCheckinFee:   "0",
  lateCheckoutFee:   "0",
  promotionId:       "",
  discountPercent:   0,
};

const DELETE_INPUT = { reservationId: "res-1" };

// PostgREST error payload — thrown by the hook's `if (error) throw error`.
const DB_ERROR = { message: "Database error", code: "XXXX", details: null, hint: null };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useCalendarBookingMutation", () => {
  // ── updateStatusMutation ────────────────────────────────────────────────────

  describe("updateStatusMutation", () => {
    it("success: invalidates 3 query keys, calls onStatusSuccess, shows no toast", async () => {
      // getUser() is called to stamp assigned_admin_id; auth returns a user.
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      server.use(
        http.patch(`${BASE}/rest/v1/reservations`, () => new HttpResponse(null, { status: 204 }))
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.updateStatusMutation.mutate(STATUS_INPUT);

      await waitFor(() => expect(onStatusSuccess).toHaveBeenCalledOnce());

      expectInvalidated();
      expect(mockToast).not.toHaveBeenCalled(); // no success toast for status changes
    });

    it("error: shows destructive toast with the DB error message, does not call callback", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      server.use(
        http.patch(`${BASE}/rest/v1/reservations`, () =>
          HttpResponse.json(DB_ERROR, { status: 400 })
        )
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.updateStatusMutation.mutate(STATUS_INPUT);

      await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
      expect(mockToast).toHaveBeenCalledWith({
        title:       "common.error",
        description: "Database error",
        variant:     "destructive",
      });
      expect(onStatusSuccess).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });

  // ── updateDetailsMutation ───────────────────────────────────────────────────

  describe("updateDetailsMutation", () => {
    it("success: invalidates 3 query keys, shows bookings.updated toast, calls onDetailsSuccess", async () => {
      server.use(
        http.patch(`${BASE}/rest/v1/reservations`, () => new HttpResponse(null, { status: 204 }))
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.updateDetailsMutation.mutate(DETAILS_INPUT);

      await waitFor(() => expect(onDetailsSuccess).toHaveBeenCalledOnce());

      expectInvalidated();
      expect(mockToast).toHaveBeenCalledOnce();
      expect(mockToast).toHaveBeenCalledWith({
        title:       "bookings.updated",
        description: "bookings.updatedDesc",
      });
    });

    it("error: shows destructive toast with DB error message, does not call callback", async () => {
      server.use(
        http.patch(`${BASE}/rest/v1/reservations`, () =>
          HttpResponse.json(DB_ERROR, { status: 400 })
        )
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.updateDetailsMutation.mutate(DETAILS_INPUT);

      await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
      expect(mockToast).toHaveBeenCalledWith({
        title:       "common.error",
        description: "Database error",
        variant:     "destructive",
      });
      expect(onDetailsSuccess).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });

  // ── deleteMutation ──────────────────────────────────────────────────────────

  describe("deleteMutation", () => {
    it("success: invalidates 3 query keys, shows bookings.deleted toast, calls onDeleteSuccess", async () => {
      server.use(
        http.delete(`${BASE}/rest/v1/reservations`, () => new HttpResponse(null, { status: 204 }))
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.deleteMutation.mutate(DELETE_INPUT);

      await waitFor(() => expect(onDeleteSuccess).toHaveBeenCalledOnce());

      expectInvalidated();
      expect(mockToast).toHaveBeenCalledOnce();
      expect(mockToast).toHaveBeenCalledWith({
        title:       "bookings.deleted",
        description: "bookings.deletedDesc",
      });
    });

    it("error: shows destructive toast with DB error message, does not call callback", async () => {
      server.use(
        http.delete(`${BASE}/rest/v1/reservations`, () =>
          HttpResponse.json(DB_ERROR, { status: 400 })
        )
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.deleteMutation.mutate(DELETE_INPUT);

      await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
      expect(mockToast).toHaveBeenCalledWith({
        title:       "common.error",
        description: "Database error",
        variant:     "destructive",
      });
      expect(onDeleteSuccess).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
