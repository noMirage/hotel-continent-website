import React from "react";
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QK } from "@/lib/queryKeys";
import type { CreateManualBookingInput } from "@/hooks/useManualBookingMutation";

vi.stubEnv("VITE_SUPABASE_URL", "https://abcdefghijkl.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k, language: "en", setLanguage: vi.fn() }),
}));

const { useManualBookingMutation } = await import("@/hooks/useManualBookingMutation");
const { supabase }                 = await import("@/integrations/supabase/client");

const BASE = "https://abcdefghijkl.supabase.co";

// ── MSW ──────────────────────────────────────────────────────────────────────
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterAll(()  => server.close());

// ── Per-test state ────────────────────────────────────────────────────────────
let queryClient:    QueryClient;
let onBookingCreated: ReturnType<typeof vi.fn>;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  vi.spyOn(queryClient, "invalidateQueries");
  onBookingCreated = vi.fn();
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
  return useManualBookingMutation({ onBookingCreated });
}

const INPUT: CreateManualBookingInput = {
  guestName:       "Jane Doe",
  guestEmail:      "jane@test.com",
  guestPhone:      "+380501234567",
  checkInDate:     new Date("2025-07-01"),
  checkOutDate:    new Date("2025-07-03"),
  numGuests:       2,
  roomUnitId:      "unit-1",
  totalPrice:      600,
  ttRate:          5,
  status:          "CONFIRMED",
  specialRequests: "",
  adminNotes:      "",
};

/** All 3 keys invalidated on success. */
function expectInvalidated() {
  expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminBookings() });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminStats() });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminCalendarReservations() });
}

/**
 * Handlers for the happy path. mutationFn makes 4 HTTP calls before the insert:
 *  1. GET /profiles          — commission_rate lookup (maybeSingle → unwraps array)
 *  2. GET /reservations      — getConflictingRooms: regular-booking overlap check
 *  3. GET /group_bookings    — getConflictingRooms: group-booking overlap check
 *  4. POST /reservations     — the actual insert
 */
function successHandlers() {
  return [
    http.get(`${BASE}/rest/v1/profiles`,      () => HttpResponse.json([])),
    http.get(`${BASE}/rest/v1/reservations`,  () => HttpResponse.json([])),
    http.get(`${BASE}/rest/v1/group_bookings`,() => HttpResponse.json([])),
    http.post(`${BASE}/rest/v1/reservations`, () => new HttpResponse(null, { status: 201 })),
  ];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useManualBookingMutation", () => {
  describe("createBookingMutation", () => {
    it("success: invalidates 3 query keys, shows created toast, calls onBookingCreated", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      server.use(...successHandlers());

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.createBookingMutation.mutate(INPUT);

      await waitFor(() => expect(onBookingCreated).toHaveBeenCalledOnce());

      expectInvalidated();
      expect(mockToast).toHaveBeenCalledOnce();
      expect(mockToast).toHaveBeenCalledWith({
        title:       "manualBooking.created",
        description: "manualBooking.createdDesc",
      });
    });

    it("error — DB insert fails: shows destructive toast, does not call callback, does not invalidate", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      server.use(
        http.get(`${BASE}/rest/v1/profiles`,      () => HttpResponse.json([])),
        http.get(`${BASE}/rest/v1/reservations`,  () => HttpResponse.json([])),
        http.get(`${BASE}/rest/v1/group_bookings`,() => HttpResponse.json([])),
        http.post(`${BASE}/rest/v1/reservations`, () =>
          HttpResponse.json(
            { message: "DB error", code: "XXXX", details: null, hint: null },
            { status: 400 },
          )
        ),
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.createBookingMutation.mutate(INPUT);

      await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
      expect(mockToast).toHaveBeenCalledWith({
        title:       "common.error",
        description: "common.unexpectedError",
        variant:     "destructive",
      });
      expect(onBookingCreated).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });

    it("error — not authenticated: shows destructive toast before any DB call", async () => {
      // getUser returns null user → hook throws 'Not authenticated' immediately,
      // no profiles / conflict / insert requests are made.
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: null as any },
        error: null,
      });

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.createBookingMutation.mutate(INPUT);

      await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
      expect(mockToast).toHaveBeenCalledWith({
        title:       "common.error",
        description: "common.unexpectedError",
        variant:     "destructive",
      });
      expect(onBookingCreated).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });

    it("error — room conflict: shows destructive toast, does not insert", async () => {
      // Conflict check returns the requested room unit → hook throws before INSERT.
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      server.use(
        http.get(`${BASE}/rest/v1/profiles`,      () => HttpResponse.json([])),
        // reservations overlap check returns the conflicting unit
        http.get(`${BASE}/rest/v1/reservations`,  () =>
          HttpResponse.json([{ room_unit_id: "unit-1" }])
        ),
        http.get(`${BASE}/rest/v1/group_bookings`,() => HttpResponse.json([])),
        // POST must not be reached — no handler registered for it
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.createBookingMutation.mutate(INPUT);

      await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
      expect(mockToast).toHaveBeenCalledWith({
        title:       "common.error",
        description: "common.unexpectedError",
        variant:     "destructive",
      });
      expect(onBookingCreated).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
