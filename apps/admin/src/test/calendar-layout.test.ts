import { describe, expect, it } from "vitest";
import { layoutStay } from "@/lib/calendar-layout";

const d = (s: string) => { const x = new Date(`${s}T00:00:00`); return x; };
// 30-day window starting 2026-11-07 (the day from the staff feedback)
const START = d("2026-11-07");
const END   = d("2026-12-06");

describe("layoutStay", () => {
  it("stay fully inside the window", () => {
    expect(layoutStay(d("2026-11-10"), d("2026-11-13"), START, END))
      .toEqual({ startCol: 3, span: 3, isActualStart: true, isActualEnd: true });
  });

  it("stay that started before the window is clipped to column 0", () => {
    expect(layoutStay(d("2026-11-05"), d("2026-11-09"), START, END))
      .toEqual({ startCol: 0, span: 2, isActualStart: false, isActualEnd: true });
  });

  it("stay that ends after the window is clipped to the last column", () => {
    const r = layoutStay(d("2026-12-04"), d("2026-12-10"), START, END);
    expect(r).toEqual({ startCol: 27, span: 3, isActualStart: true, isActualEnd: false });
  });

  it("check-out on the first visible day → stub (span 0) so today's departures are visible", () => {
    // 05.11 → 07.11: last night was 06.11, guest leaves on 07.11 = startDate
    expect(layoutStay(d("2026-11-05"), d("2026-11-07"), START, END))
      .toEqual({ startCol: 0, span: 0, isActualStart: false, isActualEnd: true });
  });

  it("stay that ended before the window is not shown", () => {
    expect(layoutStay(d("2026-11-03"), d("2026-11-06"), START, END)).toBeNull();
  });

  it("stay that starts after the window is not shown", () => {
    expect(layoutStay(d("2026-12-07"), d("2026-12-09"), START, END)).toBeNull();
    expect(layoutStay(d("2026-12-20"), d("2026-12-22"), START, END)).toBeNull();
  });

  it("stay checking in on the last visible day shows one night", () => {
    expect(layoutStay(d("2026-12-06"), d("2026-12-08"), START, END))
      .toEqual({ startCol: 29, span: 1, isActualStart: true, isActualEnd: false });
  });

  it("invalid stay (check-out not after check-in) is ignored", () => {
    expect(layoutStay(d("2026-11-10"), d("2026-11-10"), START, END)).toBeNull();
    expect(layoutStay(d("2026-11-10"), d("2026-11-09"), START, END)).toBeNull();
  });
});
