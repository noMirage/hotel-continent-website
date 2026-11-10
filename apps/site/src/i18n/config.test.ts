import { describe, expect, it } from "vitest";
import { alternatesFor, hasLocale, localizePath, stripLocale } from "./config";

describe("localizePath", () => {
  it("leaves Ukrainian (default locale) paths unprefixed", () => {
    expect(localizePath("/", "uk")).toBe("/");
    expect(localizePath("/rooms", "uk")).toBe("/rooms");
    expect(localizePath("/rooms?x=1#top", "uk")).toBe("/rooms?x=1#top");
  });

  it("prefixes English paths with /en and keeps query + hash", () => {
    expect(localizePath("/", "en")).toBe("/en");
    expect(localizePath("/rooms", "en")).toBe("/en/rooms");
    expect(localizePath("/rooms?x=1#top", "en")).toBe("/en/rooms?x=1#top");
    expect(localizePath("/#search", "en")).toBe("/en#search");
  });

  it("does not touch external, protocol-relative or non-path links", () => {
    expect(localizePath("https://example.com", "en")).toBe("https://example.com");
    expect(localizePath("//cdn.example.com/x", "en")).toBe("//cdn.example.com/x");
    expect(localizePath("tel:+380501234567", "en")).toBe("tel:+380501234567");
    expect(localizePath("#search", "en")).toBe("#search");
  });
});

describe("stripLocale", () => {
  it("detects the locale prefix and returns the locale-less path", () => {
    expect(stripLocale("/en/rooms")).toEqual({ locale: "en", path: "/rooms" });
    expect(stripLocale("/uk/rooms")).toEqual({ locale: "uk", path: "/rooms" });
    expect(stripLocale("/en")).toEqual({ locale: "en", path: "/" });
    expect(stripLocale("/rooms")).toEqual({ locale: "uk", path: "/rooms" });
    expect(stripLocale("")).toEqual({ locale: "uk", path: "/" });
  });

  it("does not treat /english or /ukraine as a locale", () => {
    expect(stripLocale("/english")).toEqual({ locale: "uk", path: "/english" });
  });
});

describe("alternatesFor", () => {
  it("builds canonical + hreflang for both locales", () => {
    expect(alternatesFor("/rooms", "en")).toEqual({
      canonical: "/en/rooms",
      languages: { uk: "/rooms", en: "/en/rooms", "x-default": "/rooms" },
    });
  });
});

describe("hasLocale", () => {
  it("accepts only the configured locales", () => {
    expect(hasLocale("uk")).toBe(true);
    expect(hasLocale("en")).toBe(true);
    expect(hasLocale("de")).toBe(false);
    expect(hasLocale("")).toBe(false);
  });
});
