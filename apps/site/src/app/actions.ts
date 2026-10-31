"use server";

import { checkBotId } from "botid/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

// Public form submissions. Each action validates the shape, then calls a SECURITY DEFINER
// RPC (supabase/migrations/20261015000001_public_submission_rpcs.sql) that re-validates and
// derives prices / room units / titles on the database side.

export type ActionResult<T = undefined> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; error: SubmissionError; data?: undefined };

export type SubmissionError =
  | "INVALID_NAME" | "INVALID_PHONE" | "INVALID_DATES" | "INVALID_ROOMS" | "INVALID_GUESTS"
  | "INVALID_EVENT_TYPE" | "INVALID_PROMOTION" | "NO_AVAILABILITY" | "INVALID_INPUT" | "BOT" | "UNKNOWN";

const KNOWN_ERRORS = new Set<SubmissionError>([
  "INVALID_NAME", "INVALID_PHONE", "INVALID_DATES", "INVALID_ROOMS", "INVALID_GUESTS",
  "INVALID_EVENT_TYPE", "INVALID_PROMOTION", "NO_AVAILABILITY",
]);

function toError(message: string | undefined): SubmissionError {
  const code = message?.trim() as SubmissionError | undefined;
  if (code && KNOWN_ERRORS.has(code)) return code;
  console.error("Public submission failed:", message);
  return "UNKNOWN";
}

/** Vercel BotID verdict for the current request (always passes in local dev). */
async function isBot(): Promise<boolean> {
  const { isBot } = await checkBotId();
  return isBot;
}

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const name = z.string().trim().min(2).max(120);
const phone = z.string().trim().min(10).max(30);
const optionalText = (max: number) => z.string().max(max).optional().nullable();

// ── Room booking ─────────────────────────────────────────────────────────────

const bookingSchema = z.object({
  checkIn: date,
  checkOut: date,
  rooms: z.array(z.object({ roomTypeId: z.string().uuid(), guests: z.number().int().min(1).max(10) })).min(1).max(10),
  guestName: name,
  guestPhone: phone,
  guestEmail: optionalText(200),
  specialRequests: optionalText(2000),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export async function createBooking(input: BookingInput): Promise<ActionResult<{ total: number; nights: number }>> {
  if (await isBot()) return { ok: false, error: "BOT" };
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const v = parsed.data;

  const { data, error } = await supabase().rpc("create_public_booking", {
    p_check_in: v.checkIn,
    p_check_out: v.checkOut,
    p_rooms: v.rooms.map((r) => ({ room_type_id: r.roomTypeId, guests: r.guests })),
    p_guest_name: v.guestName,
    p_guest_phone: v.guestPhone,
    p_guest_email: v.guestEmail ?? null,
    p_special_requests: v.specialRequests ?? null,
  });
  if (error) return { ok: false, error: toError(error.message) };
  const result = data as { total: number; nights: number };
  return { ok: true, data: { total: Number(result.total), nights: result.nights } };
}

// ── Banquet request ──────────────────────────────────────────────────────────

const banquetSchema = z.object({
  guestName: name,
  guestPhone: phone,
  eventDate: date,
  eventType: z.enum(["wedding", "birthday", "corporate", "christening", "anniversary", "conference", "kids_party"]),
  guestsCount: z.number().int().min(1).max(1000),
  comment: optionalText(2000),
});

export async function submitBanquetRequest(input: z.infer<typeof banquetSchema>): Promise<ActionResult> {
  if (await isBot()) return { ok: false, error: "BOT" };
  const parsed = banquetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const v = parsed.data;
  const { error } = await supabase().rpc("submit_banquet_request", {
    p_guest_name: v.guestName,
    p_guest_phone: v.guestPhone,
    p_event_date: v.eventDate,
    p_event_type: v.eventType,
    p_guests_count: v.guestsCount,
    p_comment: v.comment ?? null,
  });
  return error ? { ok: false, error: toError(error.message) } : { ok: true, data: undefined };
}

// ── Promotion application ────────────────────────────────────────────────────

const promoSchema = z.object({
  promotionId: z.string().uuid(),
  guestName: name,
  guestPhone: phone,
  guestEmail: optionalText(200),
  comment: optionalText(2000),
});

export async function submitPromoApplication(input: z.infer<typeof promoSchema>): Promise<ActionResult> {
  if (await isBot()) return { ok: false, error: "BOT" };
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const v = parsed.data;
  const { error } = await supabase().rpc("submit_promo_application", {
    p_promotion_id: v.promotionId,
    p_guest_name: v.guestName,
    p_guest_phone: v.guestPhone,
    p_guest_email: v.guestEmail ?? null,
    p_comment: v.comment ?? null,
  });
  return error ? { ok: false, error: toError(error.message) } : { ok: true, data: undefined };
}

// ── Group booking request ────────────────────────────────────────────────────

const groupSchema = z.object({
  guestName: name,
  guestPhone: phone,
  guestEmail: optionalText(200),
  checkIn: date,
  checkOut: date,
  numGuests: z.number().int().min(1).max(500),
  wishes: optionalText(2000),
});

export async function submitGroupRequest(input: z.infer<typeof groupSchema>): Promise<ActionResult> {
  if (await isBot()) return { ok: false, error: "BOT" };
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const v = parsed.data;
  const { error } = await supabase().rpc("submit_group_request", {
    p_guest_name: v.guestName,
    p_guest_phone: v.guestPhone,
    p_guest_email: v.guestEmail ?? null,
    p_check_in: v.checkIn,
    p_check_out: v.checkOut,
    p_num_guests: v.numGuests,
    p_wishes: v.wishes ?? null,
  });
  return error ? { ok: false, error: toError(error.message) } : { ok: true, data: undefined };
}
