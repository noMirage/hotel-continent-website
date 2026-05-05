import { describe, it, expect } from "vitest";
import { statusBadgeClass } from "@/lib/booking-status";

describe("statusBadgeClass", () => {
  it.each([
    ["UNPROCESSED", "bg-orange-100 text-orange-800"],
    ["PENDING",     "bg-accent text-accent-foreground"],
    ["CONFIRMED",   "bg-primary/10 text-primary"],
    ["CHECK_IN",    "bg-green-100 text-green-700"],
    ["CHECK_OUT",   "bg-stone-700 text-white"],
    ["CANCELLED",   "bg-destructive/10 text-destructive"],
    ["DECLINED",    "bg-destructive/10 text-destructive"],
  ])("status %s → correct class string", (status, expected) => {
    expect(statusBadgeClass(status)).toBe(expected);
  });

  it.each(["", "unknown", "confirmed", "check_in", "REFUNDED"])(
    "unknown/unrecognised status %j → muted fallback",
    (status) => {
      expect(statusBadgeClass(status)).toBe("bg-muted text-muted-foreground");
    },
  );

  it("CANCELLED and DECLINED share the same class", () => {
    expect(statusBadgeClass("CANCELLED")).toBe(statusBadgeClass("DECLINED"));
  });
});
