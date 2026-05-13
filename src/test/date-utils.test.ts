import { describe, it, expect } from "vitest";
import { toLocalDateString, fromLocalDateString } from "@/lib/date-utils";

describe("toLocalDateString", () => {
  it("returns LOCAL date for a date at 23:00 UTC (next day in UTC+2/UTC+3)", () => {
    // 2026-05-12 at 23:00 UTC = 2026-05-13 01:00 in UTC+2
    const d = new Date(Date.UTC(2026, 4, 12, 23, 0, 0));
    const result = toLocalDateString(d);
    // Must match the LOCAL year/month/day, not UTC
    const [y, m, day] = result.split("-").map(Number);
    expect(y).toBe(d.getFullYear());   // getFullYear() returns LOCAL year
    expect(m).toBe(d.getMonth() + 1); // getMonth() returns LOCAL month (0-indexed)
    expect(day).toBe(d.getDate());    // getDate() returns LOCAL day
  });

  it("formats a local midnight date correctly", () => {
    const d = new Date(2026, 4, 13); // May 13, 2026, local midnight
    expect(toLocalDateString(d)).toBe("2026-05-13");
  });
});

describe("fromLocalDateString", () => {
  it("parses '2026-05-13' as LOCAL midnight, not UTC midnight", () => {
    const d = fromLocalDateString("2026-05-13");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4);  // May is 4 (0-indexed)
    expect(d.getDate()).toBe(13);
    expect(d.getHours()).toBe(0); // local midnight
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it("round-trips correctly with toLocalDateString", () => {
    const original = "2026-05-13";
    expect(toLocalDateString(fromLocalDateString(original))).toBe(original);
  });
});
