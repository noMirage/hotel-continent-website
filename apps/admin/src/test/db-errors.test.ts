import { describe, expect, it } from "vitest";
import { describeDbError } from "@/lib/db-errors";

const t = (k: string) => `[${k}]`;

describe("describeDbError", () => {
  it("maps the ROOM_UNAVAILABLE trigger code to the friendly message", () => {
    expect(describeDbError(new Error("ROOM_UNAVAILABLE"), t)).toBe("[common.roomUnavailable]");
    // PostgREST wraps the message; the code is still inside
    expect(describeDbError(new Error("P0001: ROOM_UNAVAILABLE"), t, "generic")).toBe("[common.roomUnavailable]");
  });

  it("returns the raw message by default and the fallback when given", () => {
    expect(describeDbError(new Error("duplicate key"), t)).toBe("duplicate key");
    expect(describeDbError(new Error("duplicate key"), t, "[generic]")).toBe("[generic]");
  });

  it("handles non-Error values", () => {
    expect(describeDbError("ROOM_UNAVAILABLE", t)).toBe("[common.roomUnavailable]");
    expect(describeDbError(undefined, t)).toBe("[common.unexpectedError]");
  });
});
