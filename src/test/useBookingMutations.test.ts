import React from "react";
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QK } from "@/lib/queryKeys";
import type { Reservation } from "@/lib/supabase-types";

vi.stubEnv("VITE_SUPABASE_URL", "https://abcdefghijkl.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k, language: "en", setLanguage: vi.fn() }),
}));

const { useBookingMutations } = await import("@/hooks/useBookingMutations");
const { supabase }            = await import("@/integrations/supabase/client");

const BASE = "https://abcdefghijkl.supabase.co";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterAll(()  => server.close());

let queryClient: QueryClient;
let onStatusUpdated: ReturnType<typeof vi.fn>;
let onDeleted:       ReturnType<typeof vi.fn>;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  vi.spyOn(queryClient, "invalidateQueries");
  onStatusUpdated = vi.fn();
  onDeleted       = vi.fn();
});

afterEach(() => {
  server.resetHandlers();
  mockToast.mockClear();
  vi.restoreAllMocks();
});

function makeWrapper() {
  const qc = queryClient;
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function useHook() {
  return useBookingMutations({ onStatusUpdated, onDeleted });
}

function mockAdminUser(id = "admin-1") {
  vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
    data: { user: { id } as any },
    error: null,
  });
}

// ── updateStatusMutation ──────────────────────────────────────────────────────

describe("updateStatusMutation", () => {
  it("success: invalidates adminBookings, shows toast, calls onStatusUpdated", async () => {
    mockAdminUser();
    server.use(
      http.patch(`${BASE}/rest/v1/reservations`, () => new HttpResponse(null, { status: 204 })),
    );

    const { result } = renderHook(useHook, { wrapper: makeWrapper() });
    result.current.updateStatusMutation.mutate({ id: "booking-1", status: "PENDING" });

    await waitFor(() => expect(onStatusUpdated).toHaveBeenCalledOnce());
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminBookings() });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "bookings.updated" })
    );
  });

  it("UNPROCESSED→PENDING sets assigned_admin_id", async () => {
    mockAdminUser("admin-99");
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${BASE}/rest/v1/reservations`, async ({ request }) => {
        patchBody = await request.json() as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = renderHook(useHook, { wrapper: makeWrapper() });
    result.current.updateStatusMutation.mutate({
      id: "booking-1", status: "PENDING", currentStatus: "UNPROCESSED",
    });

    await waitFor(() => expect(onStatusUpdated).toHaveBeenCalledOnce());
    expect(patchBody).toMatchObject({ status: "PENDING", assigned_admin_id: "admin-99" });
  });

  it("CONFIRMED sets confirmed_by_admin_id, deposit_amount, payment_method", async () => {
    mockAdminUser("admin-99");
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${BASE}/rest/v1/reservations`, async ({ request }) => {
        patchBody = await request.json() as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = renderHook(useHook, { wrapper: makeWrapper() });
    result.current.updateStatusMutation.mutate({
      id: "booking-1", status: "CONFIRMED",
      depositAmount: 500, payment: "cash",
    });

    await waitFor(() => expect(onStatusUpdated).toHaveBeenCalledOnce());
    expect(patchBody).toMatchObject({
      status: "CONFIRMED",
      confirmed_by_admin_id: "admin-99",
      deposit_amount: 500,
      payment_method: "cash",
    });
  });

  it("DB error: shows destructive toast, does not call callback", async () => {
    mockAdminUser();
    server.use(
      http.patch(`${BASE}/rest/v1/reservations`, () =>
        HttpResponse.json({ message: "error", code: "XXXX", details: null, hint: null }, { status: 400 })
      ),
    );

    const { result } = renderHook(useHook, { wrapper: makeWrapper() });
    result.current.updateStatusMutation.mutate({ id: "booking-1", status: "DECLINED" });

    await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" })
    );
    expect(onStatusUpdated).not.toHaveBeenCalled();
  });
});

// ── deleteCheckinMutation ─────────────────────────────────────────────────────

describe("deleteCheckinMutation", () => {
  it("success: invalidates 3 query keys, shows toast, calls onDeleted", async () => {
    server.use(
      http.delete(`${BASE}/rest/v1/reservations`, () => new HttpResponse(null, { status: 204 })),
    );

    const { result } = renderHook(useHook, { wrapper: makeWrapper() });
    result.current.deleteCheckinMutation.mutate("booking-1");

    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminBookings() });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminCalendar() });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.dashboard() });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "bookings.deleted" })
    );
  });

  it("DB error: shows destructive toast, does not call onDeleted", async () => {
    server.use(
      http.delete(`${BASE}/rest/v1/reservations`, () =>
        HttpResponse.json({ message: "error", code: "XXXX", details: null, hint: null }, { status: 400 })
      ),
    );

    const { result } = renderHook(useHook, { wrapper: makeWrapper() });
    result.current.deleteCheckinMutation.mutate("booking-1");

    await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" })
    );
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

// ── bulkUpdateStatusMutation ──────────────────────────────────────────────────

describe("bulkUpdateStatusMutation", () => {
  it("CONFIRMED: sets confirmed_by_admin_id, invalidates adminBookings", async () => {
    mockAdminUser("admin-1");
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${BASE}/rest/v1/reservations`, async ({ request }) => {
        patchBody = await request.json() as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = renderHook(useHook, { wrapper: makeWrapper() });
    result.current.bulkUpdateStatusMutation.mutate({
      ids: ["b-1", "b-2"],
      status: "CONFIRMED",
    });

    await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
    expect(patchBody).toMatchObject({ status: "CONFIRMED", confirmed_by_admin_id: "admin-1" });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: QK.adminBookings() });
  });

  it("DECLINED: sets assigned_admin_id", async () => {
    mockAdminUser("admin-1");
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${BASE}/rest/v1/reservations`, async ({ request }) => {
        patchBody = await request.json() as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = renderHook(useHook, { wrapper: makeWrapper() });
    result.current.bulkUpdateStatusMutation.mutate({ ids: ["b-1"], status: "DECLINED" });

    await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
    expect(patchBody).toMatchObject({ status: "DECLINED", assigned_admin_id: "admin-1" });
  });
});

// ── groupConfirmMutation ──────────────────────────────────────────────────────

function makeReservation(id: string, totalPrice: number): Reservation {
  return {
    id,
    total_price: totalPrice,
    guest_name: "Test Guest",
    guest_email: null,
    guest_phone: null,
    room_unit_id: "unit-1",
    check_in_date: "2025-07-01",
    check_out_date: "2025-07-03",
    num_guests: 2,
    status: "UNPROCESSED",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    booking_source: "ONLINE",
    special_requests: null,
    admin_notes: null,
    tourist_tax_amount: null,
    deposit_amount: null,
    payment_method: null,
    assigned_admin_id: null,
    confirmed_by_admin_id: null,
    created_by_admin_id: null,
    commission_rate: null,
    group_booking_id: null,
  } as Reservation;
}

describe("groupConfirmMutation", () => {
  it("proportional deposit: each booking gets Math.round(totalDeposit * ratio)", async () => {
    mockAdminUser("admin-1");
    const patchBodies: Record<string, unknown>[] = [];
    server.use(
      http.patch(`${BASE}/rest/v1/reservations`, async ({ request }) => {
        patchBodies.push(await request.json() as Record<string, unknown>);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const bookings = [
      makeReservation("b-1", 300),
      makeReservation("b-2", 700),
    ];

    const { result } = renderHook(useHook, { wrapper: makeWrapper() });
    result.current.groupConfirmMutation.mutate({
      bookings,
      totalDeposit: 200,
      paymentMethod: "card",
    });

    await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
    expect(patchBodies).toHaveLength(2);
    // b-1: 300/1000 = 0.3 → Math.round(200 * 0.3) = 60
    expect(patchBodies[0]).toMatchObject({ status: "CONFIRMED", deposit_amount: 60, payment_method: "card" });
    // b-2: 700/1000 = 0.7 → Math.round(200 * 0.7) = 140
    expect(patchBodies[1]).toMatchObject({ status: "CONFIRMED", deposit_amount: 140, payment_method: "card" });
  });

  it("DB error on first booking: shows destructive toast", async () => {
    mockAdminUser();
    server.use(
      http.patch(`${BASE}/rest/v1/reservations`, () =>
        HttpResponse.json({ message: "error", code: "XXXX", details: null, hint: null }, { status: 400 })
      ),
    );

    const { result } = renderHook(useHook, { wrapper: makeWrapper() });
    result.current.groupConfirmMutation.mutate({
      bookings: [makeReservation("b-1", 500)],
      totalDeposit: 100,
      paymentMethod: "cash",
    });

    await waitFor(() => expect(mockToast).toHaveBeenCalledOnce());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" })
    );
  });
});
