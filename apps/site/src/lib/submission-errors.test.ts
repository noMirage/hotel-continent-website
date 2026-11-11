import { describe, expect, it } from "vitest";
import { submissionErrorKey } from "./submission-errors";

describe("submissionErrorKey", () => {
  it("maps database error codes to guest-facing translation keys", () => {
    expect(submissionErrorKey("NO_AVAILABILITY")).toBe("common.roomUnavailable");
    expect(submissionErrorKey("TOO_MANY_REQUESTS")).toBe("common.tooManyRequests");
    expect(submissionErrorKey("INVALID_PHONE")).toBe("roomDetails.errorPhone");
    expect(submissionErrorKey("INVALID_DATES")).toBe("roomDetails.errorDates");
    expect(submissionErrorKey("INVALID_INPUT")).toBe("roomDetails.errorFields");
  });

  it("falls back to a generic message for unexpected failures", () => {
    expect(submissionErrorKey("UNKNOWN")).toBe("roomDetails.tryAgain");
    expect(submissionErrorKey("BOT")).toBe("roomDetails.tryAgain");
  });
});
