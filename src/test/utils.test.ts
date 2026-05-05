import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("joins multiple classes with a space", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", false, null, undefined, 0 as any, "bar")).toBe("foo bar");
  });

  it("handles conditional object syntax from clsx", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("handles array inputs from clsx", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("merges conflicting Tailwind classes — last one wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("does not merge non-conflicting Tailwind classes", () => {
    expect(cn("p-2", "m-4")).toBe("p-2 m-4");
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("handles mixed conditionals and conflicts together", () => {
    expect(cn("px-2", { "px-4": true, "py-1": false }, "py-2")).toBe("px-4 py-2");
  });

  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns an empty string when all inputs are falsy", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});
