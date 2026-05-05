import { describe, it, expect } from "vitest";
import { getEffectivePrice, getMinPrice } from "@/lib/room-pricing";

const prices = [
  { guest_count: 1, price_per_night: 80 },
  { guest_count: 2, price_per_night: 100 },
  { guest_count: 3, price_per_night: 120 },
];

describe("getEffectivePrice", () => {
  it("returns the matching price for a given guest count", () => {
    expect(getEffectivePrice(prices, 1, 999)).toBe(80);
    expect(getEffectivePrice(prices, 2, 999)).toBe(100);
    expect(getEffectivePrice(prices, 3, 999)).toBe(120);
  });

  it("falls back to basePrice when no match exists", () => {
    expect(getEffectivePrice(prices, 4, 150)).toBe(150);
    expect(getEffectivePrice(prices, 0, 50)).toBe(50);
  });

  it("returns basePrice when prices array is empty", () => {
    expect(getEffectivePrice([], 2, 200)).toBe(200);
  });

  it("uses the first matching entry (no duplicates assumed)", () => {
    const dupes = [
      { guest_count: 2, price_per_night: 100 },
      { guest_count: 2, price_per_night: 999 },
    ];
    expect(getEffectivePrice(dupes, 2, 0)).toBe(100);
  });
});

describe("getMinPrice", () => {
  it("returns the lowest price_per_night across all entries", () => {
    expect(getMinPrice(prices, 999)).toBe(80);
  });

  it("returns basePrice when prices array is empty", () => {
    expect(getMinPrice([], 60)).toBe(60);
    expect(getMinPrice([], 0)).toBe(0);
  });

  it("handles a single-entry array", () => {
    expect(getMinPrice([{ guest_count: 1, price_per_night: 75 }], 999)).toBe(75);
  });

  it("handles all entries having the same price", () => {
    const flat = [
      { guest_count: 1, price_per_night: 100 },
      { guest_count: 2, price_per_night: 100 },
    ];
    expect(getMinPrice(flat, 999)).toBe(100);
  });

  it("ignores guest_count — only price_per_night matters", () => {
    const mixed = [
      { guest_count: 10, price_per_night: 50 },
      { guest_count: 1,  price_per_night: 200 },
    ];
    expect(getMinPrice(mixed, 999)).toBe(50);
  });
});
