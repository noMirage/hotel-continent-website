import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.stubEnv("VITE_SUPABASE_URL", "https://abcdefghijkl.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k, language: "en", setLanguage: vi.fn() }),
}));

// Mock useAvailability so network is not required.
const mockAvailabilityData = vi.hoisted(() => ({
  data: undefined as { id: string; room_number: string }[] | undefined,
  isLoading: false,
}));
vi.mock("@/hooks/useAvailability", () => ({
  useAvailability: () => ({ data: mockAvailabilityData.data, isLoading: mockAvailabilityData.isLoading }),
}));

const { useRoomBookingForm } = await import("@/hooks/useRoomBookingForm");

import type { RoomType } from "@/lib/supabase-types";

function makeRoom(overrides: Partial<RoomType> = {}): RoomType {
  return {
    id: "room-1", name: "Standard Room", description: "A room",
    short_description: "Standard", amenities: [], slug: "standard-room",
    base_price: 100, max_guests: 2, is_active: true, sort_order: 1,
    bed_type: "double_bed", image_url: null, size_sqm: 25,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    name_uk: null, description_uk: null, short_description_uk: null, amenities_uk: null,
    ...overrides,
  };
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, null, children)
    );
}

function makeUrlParams(params: Record<string, string> = {}) {
  return new URLSearchParams(params);
}

const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

beforeEach(() => {
  mockAvailabilityData.data = undefined;
  mockAvailabilityData.isLoading = false;
  mockToast.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useRoomBookingForm", () => {
  it("initial state: guestPhone is '+380 ', checkIn/checkOut are undefined, nights = 0", () => {
    const { result } = renderHook(
      () => useRoomBookingForm(null, "", makeUrlParams()),
      { wrapper: makeWrapper() }
    );
    expect(result.current.guestPhone).toBe("+380 ");
    expect(result.current.checkIn).toBeUndefined();
    expect(result.current.checkOut).toBeUndefined();
    expect(result.current.nights).toBe(0);
    expect(result.current.minPrice).toBe(0);
  });

  it("URL params: checkIn/checkOut/adults are pre-populated", () => {
    const { result } = renderHook(
      () => useRoomBookingForm(null, "", makeUrlParams({ checkIn: "2025-07-01", checkOut: "2025-07-05", adults: "3" })),
      { wrapper: makeWrapper() }
    );
    expect(result.current.checkIn).toBeInstanceOf(Date);
    expect(result.current.checkOut).toBeInstanceOf(Date);
    expect(result.current.rooms[0].guests).toBe(3);
  });

  it("handleSubmit with no dates/availableUnits → calls toast with errorDates", async () => {
    const { result } = renderHook(
      () => useRoomBookingForm(makeRoom(), "standard-room", makeUrlParams()),
      { wrapper: makeWrapper() }
    );
    await act(async () => { await result.current.handleSubmit(mockEvent); });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "roomDetails.errorDates", variant: "destructive" })
    );
  });

  it("handleSubmit with valid dates but missing guestName → calls toast with errorFields", async () => {
    mockAvailabilityData.data = [{ id: "unit-1", room_number: "101" }];
    const { result } = renderHook(
      () => useRoomBookingForm(makeRoom(), "standard-room", makeUrlParams()),
      { wrapper: makeWrapper() }
    );
    act(() => {
      result.current.setCheckIn(new Date("2025-07-01"));
      result.current.setCheckOut(new Date("2025-07-05"));
    });
    await act(async () => { await result.current.handleSubmit(mockEvent); });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "roomDetails.errorFields", variant: "destructive" })
    );
  });

  it("handleSubmit with short phone number → calls toast with errorPhone", async () => {
    mockAvailabilityData.data = [{ id: "unit-1", room_number: "101" }];
    const { result } = renderHook(
      () => useRoomBookingForm(makeRoom(), "standard-room", makeUrlParams()),
      { wrapper: makeWrapper() }
    );
    act(() => {
      result.current.setCheckIn(new Date("2025-07-01"));
      result.current.setCheckOut(new Date("2025-07-05"));
      result.current.setGuestName("John Doe");
      result.current.setGuestPhone("+380 63");
    });
    await act(async () => { await result.current.handleSubmit(mockEvent); });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "roomDetails.errorPhone", variant: "destructive" })
    );
  });
});
