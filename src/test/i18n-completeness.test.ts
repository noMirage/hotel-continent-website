import { describe, it, expect } from "vitest";
import { translations } from "@/i18n/translations";
import type { TranslationKey } from "@/i18n/translations";

const keys = Object.keys(translations) as TranslationKey[];

describe("i18n completeness", () => {
  it("has at least one translation key", () => {
    expect(keys.length).toBeGreaterThan(0);
  });

  it.each(keys)('"%s" has a non-empty English string', (key) => {
    const value = translations[key].en;
    expect(typeof value).toBe("string");
    expect(value.trim().length).toBeGreaterThan(0);
  });

  it.each(keys)('"%s" has a non-empty Ukrainian string', (key) => {
    const value = translations[key].uk;
    expect(typeof value).toBe("string");
    expect(value.trim().length).toBeGreaterThan(0);
  });

  it("en and uk sets are identical (no key missing a language)", () => {
    const missingEn  = keys.filter(k => !translations[k].en?.trim());
    const missingUk  = keys.filter(k => !translations[k].uk?.trim());
    expect(missingEn,  "keys with empty/missing 'en'").toEqual([]);
    expect(missingUk,  "keys with empty/missing 'uk'").toEqual([]);
  });
});
