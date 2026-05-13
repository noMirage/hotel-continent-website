import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { RoomType } from "@/lib/supabase-types";

// Mock useLanguage so we can control the language in each test.
const mockLanguage = { language: "en" };
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => mockLanguage,
}));

const { useLocalizedRoom, useLocalizedRooms } = await import("@/hooks/useLocalizedRoom");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<RoomType> = {}): RoomType {
  return {
    id: "room-1",
    name: "Standard Room",
    description: "A standard room",
    short_description: "Standard",
    amenities: ["WiFi", "TV"],
    slug: "standard-room",
    base_price: 100,
    max_guests: 2,
    is_active: true,
    sort_order: 1,
    bed_type: "double_bed",
    image_url: null,
    size_sqm: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Ukrainian overrides – null by default (no translation)
    name_uk: null,
    description_uk: null,
    short_description_uk: null,
    amenities_uk: null,
    ...overrides,
  };
}

function setLanguage(lang: string) {
  mockLanguage.language = lang;
}

// ── useLocalizedRoom ──────────────────────────────────────────────────────────

describe("useLocalizedRoom", () => {
  it("null input → returns null", () => {
    setLanguage("en");
    const { result } = renderHook(() => useLocalizedRoom(null));
    expect(result.current).toBeNull();
  });

  it("undefined input → returns undefined", () => {
    setLanguage("en");
    const { result } = renderHook(() => useLocalizedRoom(undefined));
    expect(result.current).toBeUndefined();
  });

  it("language = 'en' → returns room unchanged (no _uk fields used)", () => {
    setLanguage("en");
    const room = makeRoom({ name_uk: "Стандартний номер" });
    const { result } = renderHook(() => useLocalizedRoom(room));
    expect(result.current).toBe(room); // exact same reference
  });

  it("language = 'uk', name_uk present → returns name_uk", () => {
    setLanguage("uk");
    const room = makeRoom({ name_uk: "Стандартний номер" });
    const { result } = renderHook(() => useLocalizedRoom(room));
    expect(result.current?.name).toBe("Стандартний номер");
  });

  it("language = 'uk', name_uk missing (null) → falls back to name", () => {
    setLanguage("uk");
    const room = makeRoom({ name_uk: null });
    const { result } = renderHook(() => useLocalizedRoom(room));
    expect(result.current?.name).toBe("Standard Room");
  });

  it("language = 'uk', amenities_uk populated → returns amenities_uk", () => {
    setLanguage("uk");
    const room = makeRoom({ amenities_uk: ["Wi-Fi", "Телевізор"] });
    const { result } = renderHook(() => useLocalizedRoom(room));
    expect(result.current?.amenities).toEqual(["Wi-Fi", "Телевізор"]);
  });

  it("language = 'uk', amenities_uk is empty array → falls back to amenities", () => {
    setLanguage("uk");
    const room = makeRoom({ amenities_uk: [] });
    const { result } = renderHook(() => useLocalizedRoom(room));
    expect(result.current?.amenities).toEqual(["WiFi", "TV"]);
  });

  it("language = 'uk', amenities_uk is null → falls back to amenities", () => {
    setLanguage("uk");
    const room = makeRoom({ amenities_uk: null });
    const { result } = renderHook(() => useLocalizedRoom(room));
    expect(result.current?.amenities).toEqual(["WiFi", "TV"]);
  });

  it("language = 'uk', returns localized copy (not same reference)", () => {
    setLanguage("uk");
    const room = makeRoom({ name_uk: "Стандартний номер" });
    const { result } = renderHook(() => useLocalizedRoom(room));
    expect(result.current).not.toBe(room);
    expect(result.current?.name).toBe("Стандартний номер");
  });
});

// ── useLocalizedRooms ─────────────────────────────────────────────────────────

describe("useLocalizedRooms", () => {
  it("undefined input → returns undefined", () => {
    setLanguage("en");
    const { result } = renderHook(() => useLocalizedRooms(undefined));
    expect(result.current).toBeUndefined();
  });

  it("language = 'en' → returns same array reference (no copy made)", () => {
    setLanguage("en");
    const rooms = [makeRoom(), makeRoom({ id: "room-2" })];
    const { result } = renderHook(() => useLocalizedRooms(rooms));
    expect(result.current).toBe(rooms);
  });

  it("language = 'uk' → localizes all rooms in array", () => {
    setLanguage("uk");
    const rooms = [
      makeRoom({ name_uk: "Стандартний" }),
      makeRoom({ id: "room-2", name_uk: "Люкс" }),
    ];
    const { result } = renderHook(() => useLocalizedRooms(rooms));
    expect(result.current?.[0].name).toBe("Стандартний");
    expect(result.current?.[1].name).toBe("Люкс");
  });

  it("language = 'uk', room with no name_uk → falls back to name", () => {
    setLanguage("uk");
    const rooms = [makeRoom({ name_uk: null })];
    const { result } = renderHook(() => useLocalizedRooms(rooms));
    expect(result.current?.[0].name).toBe("Standard Room");
  });
});
