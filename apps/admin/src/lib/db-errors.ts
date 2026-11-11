/**
 * Turns an error raised by a mutation into the text shown in the toast.
 *
 * Database triggers raise short codes (see supabase/migrations/20261110000003):
 *   ROOM_UNAVAILABLE — the room unit already has a blocking booking for those nights.
 * Everything else falls back to `fallback` (default: the raw message).
 *
 * Accepts Error instances, PostgREST error payloads ({ message, code, … }) and strings.
 */
export function describeDbError(e: unknown, t: (key: string) => string, fallback?: string): string {
  const message =
    typeof e === "string" ? e
    : e && typeof e === "object" && typeof (e as { message?: unknown }).message === "string" ? (e as { message: string }).message
    : "";
  if (message.includes("ROOM_UNAVAILABLE")) return t("common.roomUnavailable");
  return fallback ?? (message || t("common.unexpectedError"));
}
