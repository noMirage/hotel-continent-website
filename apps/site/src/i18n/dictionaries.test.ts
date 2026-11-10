import { describe, expect, it } from "vitest";
import en from "./dictionaries/en.json";
import uk from "./dictionaries/uk.json";
import { translate } from "./translate";

// The dictionaries are generated from the admin translations by scripts/sync-i18n.mjs.
// These tests catch a stale or partial regeneration: every key must exist in both
// languages with a non-empty string.

const enKeys = Object.keys(en).sort();
const ukKeys = Object.keys(uk).sort();

describe("site dictionaries", () => {
  it("have the same key set in en and uk", () => {
    expect(ukKeys).toEqual(enKeys);
  });

  it("have no empty strings", () => {
    const empty = [
      ...enKeys.filter((k) => !(en as Record<string, string>)[k]?.trim()).map((k) => `en:${k}`),
      ...ukKeys.filter((k) => !(uk as Record<string, string>)[k]?.trim()).map((k) => `uk:${k}`),
    ];
    expect(empty).toEqual([]);
  });

  it("contain the keys the public form error mapping relies on", () => {
    for (const key of [
      "common.roomUnavailable",
      "common.tooManyRequests",
      "roomDetails.errorPhone",
      "roomDetails.errorDates",
      "roomDetails.errorFields",
      "roomDetails.tryAgain",
    ]) {
      expect(en, key).toHaveProperty(key);
      expect(uk, key).toHaveProperty(key);
    }
  });
});

describe("translate", () => {
  it("substitutes {placeholders} and falls back to the key", () => {
    expect(translate({ "a.b": "Room {n}" }, "a.b", { n: "3" })).toBe("Room 3");
    expect(translate({}, "missing.key")).toBe("missing.key");
  });
});
