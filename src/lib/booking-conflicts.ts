import { supabase } from "@/integrations/supabase/client";

const BLOCKING = ["UNPROCESSED", "PENDING", "CONFIRMED", "CHECK_IN"] as const;

/**
 * Returns the room_unit_ids that already have an active booking overlapping
 * [checkIn, checkOut). Empty array = no conflicts.
 *
 * Pass excludeReservationIds to ignore specific reservations (e.g. the one
 * being edited). Pass excludeGroupBookingId for the group booking being edited.
 */
export async function getConflictingRooms(
  roomUnitIds: string[],
  checkIn: string,   // "yyyy-MM-dd"
  checkOut: string,  // "yyyy-MM-dd"
  excludeReservationIds?: string[],
  excludeGroupBookingId?: string,
): Promise<string[]> {
  if (roomUnitIds.length === 0) return [];

  const conflicting = new Set<string>();

  // ── Regular reservations ───────────────────────────────────────────────────
  let resQ = supabase
    .from("reservations")
    .select("room_unit_id")
    .in("room_unit_id", roomUnitIds)
    .in("status", BLOCKING as unknown as string[])
    .lt("check_in_date", checkOut)
    .gt("check_out_date", checkIn);

  if (excludeReservationIds?.length) {
    resQ = resQ.not("id", "in", `(${excludeReservationIds.join(",")})`);
  }

  const { data: resCon } = await resQ;
  for (const r of resCon ?? []) conflicting.add(r.room_unit_id);

  // ── Group bookings ─────────────────────────────────────────────────────────
  let grpQ = supabase
    .from("group_bookings")
    .select("room_unit_ids")
    .filter("room_unit_ids", "ov", `{${roomUnitIds.join(",")}}`)
    .in("status", BLOCKING as unknown as string[])
    .lt("check_in_date", checkOut)
    .gt("check_out_date", checkIn);

  if (excludeGroupBookingId) {
    grpQ = grpQ.neq("id", excludeGroupBookingId);
  }

  const { data: grpCon } = await grpQ;
  for (const g of grpCon ?? []) {
    for (const id of g.room_unit_ids as string[]) {
      if (roomUnitIds.includes(id)) conflicting.add(id);
    }
  }

  return Array.from(conflicting);
}

/**
 * Checks whether early check-in or late check-out fees can be applied to a
 * booking without conflicting with adjacent bookings for the same room.
 *
 * Early check-in conflict: another booking checks out on the same day as
 * this booking's check-in (room won't be ready in time).
 *
 * Late check-out conflict: another booking checks in on the same day as
 * this booking's check-out (the room is needed by the next guest).
 */
export async function checkFeeConflicts(
  roomUnitId: string,
  checkInDate: string,   // "yyyy-MM-dd"
  checkOutDate: string,  // "yyyy-MM-dd"
  earlyCheckinFee: number,
  lateCheckoutFee: number,
  excludeReservationId?: string,
): Promise<{ earlyConflict: boolean; lateConflict: boolean }> {
  const ACTIVE = ["UNPROCESSED", "PENDING", "CONFIRMED", "CHECK_IN"] as string[];
  let earlyConflict = false;
  let lateConflict = false;

  if (earlyCheckinFee > 0) {
    let q = supabase
      .from("reservations")
      .select("id")
      .eq("room_unit_id", roomUnitId)
      .in("status", ACTIVE)
      .eq("check_out_date", checkInDate);
    if (excludeReservationId) q = q.neq("id", excludeReservationId);
    const { data } = await q;
    earlyConflict = (data?.length ?? 0) > 0;
  }

  if (lateCheckoutFee > 0) {
    let q = supabase
      .from("reservations")
      .select("id")
      .eq("room_unit_id", roomUnitId)
      .in("status", ACTIVE)
      .eq("check_in_date", checkOutDate);
    if (excludeReservationId) q = q.neq("id", excludeReservationId);
    const { data } = await q;
    lateConflict = (data?.length ?? 0) > 0;
  }

  return { earlyConflict, lateConflict };
}
