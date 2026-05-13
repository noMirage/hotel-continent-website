import { describe, it, expect } from "vitest";
import { formatUkrPhone, toTelHref } from "@/lib/phone-utils";

describe("formatUkrPhone", () => {
  it("empty string → '+380 ' prefix only", () => {
    expect(formatUkrPhone("")).toBe("+380 ");
  });

  it("strips non-digit characters and formats 2 digits", () => {
    expect(formatUkrPhone("+380 63")).toBe("+380 63");
  });

  it("formats 5 digits (operator code + partial number)", () => {
    expect(formatUkrPhone("+380 63123")).toBe("+380 63 123");
  });

  it("formats 7 digits", () => {
    expect(formatUkrPhone("+380 631234567".slice(0, 12))).toBe("+380 63 123 45");
  });

  it("formats full 9-digit number correctly", () => {
    expect(formatUkrPhone("+380 631234567")).toBe("+380 63 123 45 67");
  });

  it("truncates at 9 digits after country code", () => {
    expect(formatUkrPhone("+380 6312345678")).toBe("+380 63 123 45 67");
  });

  it("raw 10-digit Ukrainian number: leading 0 preserved in first 9 chars", () => {
    expect(formatUkrPhone("0631234567")).toBe("+380 06 312 34 56");
  });
});

describe("toTelHref", () => {
  it("converts formatted phone to tel: href", () => {
    expect(toTelHref("+380 63 123 45 67")).toBe("tel:+380631234567");
  });

  it("works with no spaces", () => {
    expect(toTelHref("+380631234567")).toBe("tel:+380631234567");
  });
});
