import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

vi.stubEnv("VITE_SUPABASE_URL", "https://abcdefghijkl.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

const { getConflictingRooms, checkFeeConflicts } = await import("@/lib/booking-conflicts");

const BASE = "https://abcdefghijkl.supabase.co";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterAll(()  => server.close());
afterEach(()  => server.resetHandlers());

// ── getConflictingRooms ───────────────────────────────────────────────────────

describe("getConflictingRooms", () => {
  it("empty roomUnitIds: returns [] without any HTTP calls", async () => {
    const result = await getConflictingRooms([], "2025-07-01", "2025-07-03");
    expect(result).toEqual([]);
  });

  it("no conflicts: both tables return empty arrays → returns []", async () => {
    server.use(
      http.get(`${BASE}/rest/v1/reservations`,  () => HttpResponse.json([])),
      http.get(`${BASE}/rest/v1/group_bookings`, () => HttpResponse.json([])),
    );
    const result = await getConflictingRooms(["unit-1"], "2025-07-01", "2025-07-03");
    expect(result).toEqual([]);
  });

  it("conflict from regular reservations: returns conflicting unit ids", async () => {
    server.use(
      http.get(`${BASE}/rest/v1/reservations`, () =>
        HttpResponse.json([{ room_unit_id: "unit-1" }, { room_unit_id: "unit-2" }])
      ),
      http.get(`${BASE}/rest/v1/group_bookings`, () => HttpResponse.json([])),
    );
    const result = await getConflictingRooms(["unit-1", "unit-2", "unit-3"], "2025-07-01", "2025-07-03");
    expect(result.sort()).toEqual(["unit-1", "unit-2"]);
  });

  it("conflict from group bookings: returns ids found in room_unit_ids array", async () => {
    server.use(
      http.get(`${BASE}/rest/v1/reservations`, () => HttpResponse.json([])),
      http.get(`${BASE}/rest/v1/group_bookings`, () =>
        HttpResponse.json([{ room_unit_ids: ["unit-1", "unit-3", "unit-99"] }])
      ),
    );
    const result = await getConflictingRooms(["unit-1", "unit-2", "unit-3"], "2025-07-01", "2025-07-03");
    // unit-99 is NOT in the requested set, so only unit-1 and unit-3 appear
    expect(result.sort()).toEqual(["unit-1", "unit-3"]);
  });

  it("conflicts from both sources: deduplicates results", async () => {
    server.use(
      http.get(`${BASE}/rest/v1/reservations`, () =>
        HttpResponse.json([{ room_unit_id: "unit-1" }])
      ),
      http.get(`${BASE}/rest/v1/group_bookings`, () =>
        HttpResponse.json([{ room_unit_ids: ["unit-1", "unit-2"] }])
      ),
    );
    const result = await getConflictingRooms(["unit-1", "unit-2"], "2025-07-01", "2025-07-03");
    expect(result.sort()).toEqual(["unit-1", "unit-2"]);
  });
});

// ── checkFeeConflicts ─────────────────────────────────────────────────────────

describe("checkFeeConflicts", () => {
  it("both fees are 0: skips DB queries, returns no conflicts", async () => {
    // No MSW handlers registered — any HTTP call would be warned
    const result = await checkFeeConflicts("unit-1", "2025-07-01", "2025-07-03", 0, 0);
    expect(result).toEqual({ earlyConflict: false, lateConflict: false });
  });

  it("earlyCheckinFee > 0 with adjacent checkout: earlyConflict true", async () => {
    server.use(
      // Another booking checks out on the same day as our check-in
      http.get(`${BASE}/rest/v1/reservations`, () =>
        HttpResponse.json([{ id: "existing-1" }])
      ),
    );
    const result = await checkFeeConflicts("unit-1", "2025-07-03", "2025-07-05", 20, 0);
    expect(result.earlyConflict).toBe(true);
    expect(result.lateConflict).toBe(false);
  });

  it("lateCheckoutFee > 0 with adjacent checkin: lateConflict true", async () => {
    server.use(
      // Another booking checks in on the same day as our check-out
      http.get(`${BASE}/rest/v1/reservations`, () =>
        HttpResponse.json([{ id: "existing-2" }])
      ),
    );
    const result = await checkFeeConflicts("unit-1", "2025-07-01", "2025-07-03", 0, 20);
    expect(result.earlyConflict).toBe(false);
    expect(result.lateConflict).toBe(true);
  });

  it("both fees > 0, no adjacent bookings: both false", async () => {
    server.use(
      http.get(`${BASE}/rest/v1/reservations`, () => HttpResponse.json([])),
    );
    const result = await checkFeeConflicts("unit-1", "2025-07-01", "2025-07-03", 20, 20);
    expect(result).toEqual({ earlyConflict: false, lateConflict: false });
  });
});
