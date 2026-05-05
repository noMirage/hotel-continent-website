import React from "react";
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QK } from "@/lib/queryKeys";
import type { CreateStdBookingInput, CreateGroupBookingInput } from "@/hooks/useCalendarGroupMutation";

vi.stubEnv("VITE_SUPABASE_URL", "https://abcdefghijkl.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k, language: "en", setLanguage: vi.fn() }),
}));

const { useCalendarGroupMutation } = await import("@/hooks/useCalendarGroupMutation");
const { supabase }                  = await import("@/integrations/supabase/client");

const BASE = "https://abcdefghijkl.supabase.co";

// ── MSW ──────────────────────────────────────────────────────────────────────
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterAll(()  => server.close());

// ── Per-test state ────────────────────────────────────────────────────────────
let queryClient:   QueryClient;
let onStdSuccess:  ReturnType<typeof vi.fn>;
let onGroupSuccess: ReturnType<typeof vi.fn>;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  vi.spyOn(queryClient, "invalidateQueries");
  onStdSuccess   = vi.fn();
  onGroupSuccess = vi.fn();
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
  return useCalendarGroupMutation({ onStdSuccess, onGroupSuccess });
}

// Minimal room-unit shape satisfying all field accesses inside the hook.
const ROOM_UNIT = {
  id: "unit-1", room_number: "101", room_type_id: "rt-1",
  is_active: true, floor: null, notes: null,
  bed_config: null, extra_accommodation_enabled: false, extra_accommodation_max: null,
  room_type: { name: "Standard", name_uk: null, base_price: 500, max_guests: 2 },
} as any;

const STD_INPUT: CreateStdBookingInput = {
  checkIn:           new Date("2025-07-01"),
  checkOut:          new Date("2025-07-03"),
  selectedRooms:     [ROOM_UNIT],
  allRoomUnits:      [ROOM_UNIT],
  allGuestPrices:    [],          // empty → uses base_price
  guestName:         "Jane Group",
  guestEmail:        "group@test.com",
  guestPhone:        "",
  numGuests:         2,
  ttRate:            5,
  discountMultiplier: 1.0,
  discountPercent:   0,
  promotionId:       null,
  status:            "CONFIRMED",
  specialRequests:   "",
  adminNotes:        "",
};

// selectedCalcId is a real calc id — skips the custom-calc insert branch.
const GROUP_STD_INPUT: CreateGroupBookingInput = {
  checkIn:                  new Date("2025-07-01"),
  checkOut:                 new Date("2025-07-03"),
  roomUnitIds:              ["unit-1"],
  allRoomUnits:             [ROOM_UNIT],
  bookingName:              "Test Group",
  contactPerson:            "John",
  phone:                    "",
  numGuests:                5,
  selectedCalcId:           "calc-existing",
  customPricePerPersonNight: "",
  finalGroupTotal:          1000,
  customCalcTotal:          0,
  status:                   "CONFIRMED",
  adminNotes:               "",
  depositAmount:            "",
};

// selectedCalcId === "custom" triggers the extra group_calculations insert.
const GROUP_CUSTOM_INPUT: CreateGroupBookingInput = {
  ...GROUP_STD_INPUT,
  selectedCalcId:           "custom",
  customPricePerPersonNight: "100",
  customCalcTotal:          800,
};

// ── MSW handler sets ──────────────────────────────────────────────────────────

// getConflictingRooms makes two GETs (regular reservations + group bookings).
const noConflictHandlers = [
  http.get(`${BASE}/rest/v1/reservations`,   () => HttpResponse.json([])),
  http.get(`${BASE}/rest/v1/group_bookings`, () => HttpResponse.json([])),
];

// group_bookings insert uses .select().single() → single JSON object response.
const groupBookingInsertHandler = http.post(
  `${BASE}/rest/v1/group_bookings`,
  () => HttpResponse.json({ id: "gb-1", booking_name: "Test Group" }, { status: 201 }),
);

// room assignments insert — no .select(), empty 201 body is fine.
const assignmentInsertHandler = http.post(
  `${BASE}/rest/v1/group_booking_room_assignments`,
  () => new HttpResponse(null, { status: 201 }),
);

// ── invalidate helpers ────────────────────────────────────────────────────────

function expectStdInvalidated() {
  expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminBookings() });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminCalendarReservations() });
}

function expectGroupInvalidated() {
  expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminCalendarGroupBookings() });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.groupBookings() });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.groupRoomAssignments() });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useCalendarGroupMutation", () => {
  // ── createStdMutation ───────────────────────────────────────────────────────

  describe("createStdMutation", () => {
    it("success: invalidates 2 query keys, shows created toast, calls onStdSuccess", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      server.use(
        ...noConflictHandlers,
        http.get(`${BASE}/rest/v1/profiles`,     () => HttpResponse.json([])),
        http.post(`${BASE}/rest/v1/reservations`, () => new HttpResponse(null, { status: 201 })),
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.createStdMutation.mutate(STD_INPUT);

      await waitFor(() => expect(onStdSuccess).toHaveBeenCalledOnce());

      expectStdInvalidated();
      expect(mockToast).toHaveBeenCalledOnce();
      expect(mockToast).toHaveBeenCalledWith({
        title:       "manualBooking.created",
        description: "manualBooking.createdDesc",
      });
    });

    it("error: shows destructive toast with e.message, does not call callback, does not invalidate", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      server.use(
        ...noConflictHandlers,
        http.get(`${BASE}/rest/v1/profiles`, () => HttpResponse.json([])),
        http.post(`${BASE}/rest/v1/reservations`, () =>
          HttpResponse.json(
            { message: "Insert failed", code: "XXXX", details: null, hint: null },
            { status: 400 },
          )
        ),
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.createStdMutation.mutate(STD_INPUT);

      await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
      // onError uses e.message directly — not a fixed t("common.unexpectedError") key.
      expect(mockToast).toHaveBeenCalledWith({
        title:       "common.error",
        description: "Insert failed",
        variant:     "destructive",
      });
      expect(onStdSuccess).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });

  // ── createGroupMutation ─────────────────────────────────────────────────────

  describe("createGroupMutation", () => {
    it("success (standard calc): invalidates 3 keys, shows created toast, calls onGroupSuccess", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      server.use(
        ...noConflictHandlers,
        groupBookingInsertHandler,
        assignmentInsertHandler,
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.createGroupMutation.mutate(GROUP_STD_INPUT);

      await waitFor(() => expect(onGroupSuccess).toHaveBeenCalledOnce());

      expectGroupInvalidated();
      expect(mockToast).toHaveBeenCalledOnce();
      expect(mockToast).toHaveBeenCalledWith({ title: "groupBookings.created" });
    });

    it("success (custom calc): invalidates 4 keys (+groupCalculations), shows 2 toasts, calls onGroupSuccess", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      server.use(
        ...noConflictHandlers,
        // custom calc path inserts into group_calculations first
        http.post(`${BASE}/rest/v1/group_calculations`, () =>
          HttpResponse.json(
            { id: "calc-new", name: "Custom — Test Group", price_per_person_per_night: 100 },
            { status: 201 },
          )
        ),
        groupBookingInsertHandler,
        assignmentInsertHandler,
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.createGroupMutation.mutate(GROUP_CUSTOM_INPUT);

      await waitFor(() => expect(onGroupSuccess).toHaveBeenCalledOnce());

      // 3 from onSuccess + 1 QK.groupCalculations() fired inside mutationFn
      expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(4);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminCalendarGroupBookings() });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.groupBookings() });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.groupRoomAssignments() });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.groupCalculations() });

      expect(mockToast).toHaveBeenCalledTimes(2);
      expect(mockToast).toHaveBeenCalledWith({ title: "groupBookings.created" });
      expect(mockToast).toHaveBeenCalledWith({ description: "groupBookings.customSavedToCalc" });
    });

    it("error: shows destructive toast with e.message, does not call callback, does not invalidate", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: { id: "admin-1" } as any },
        error: null,
      });
      server.use(
        ...noConflictHandlers,
        http.post(`${BASE}/rest/v1/group_bookings`, () =>
          HttpResponse.json(
            { message: "Booking failed", code: "XXXX", details: null, hint: null },
            { status: 400 },
          )
        ),
      );

      const { result } = renderHook(useHook, { wrapper: makeWrapper() });
      result.current.createGroupMutation.mutate(GROUP_STD_INPUT);

      await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
      expect(mockToast).toHaveBeenCalledWith({
        title:       "common.error",
        description: "Booking failed",
        variant:     "destructive",
      });
      expect(onGroupSuccess).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
