import type { SubmissionError } from "@/app/actions";

/** Translation key shown to the guest for a failed public form submission. */
export function submissionErrorKey(error: SubmissionError): string {
  switch (error) {
    case "NO_AVAILABILITY": return "common.roomUnavailable";
    case "INVALID_PHONE":   return "roomDetails.errorPhone";
    case "INVALID_DATES":   return "roomDetails.errorDates";
    case "INVALID_NAME":
    case "INVALID_INPUT":
    case "INVALID_ROOMS":
    case "INVALID_GUESTS":  return "roomDetails.errorFields";
    default:                return "roomDetails.tryAgain";
  }
}
