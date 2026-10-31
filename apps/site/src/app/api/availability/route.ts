import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD[&roomTypeId=<uuid>]
 * Free active room units for the stay. Uses the get_blocked_unit_ids RPC, so no guest
 * data ever leaves the database.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const roomTypeId = params.get("roomTypeId");

  if (!DATE.test(checkIn) || !DATE.test(checkOut) || checkOut <= checkIn) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  const db = supabase();
  let unitsQuery = db.from("room_units").select("id, room_number, room_type_id").eq("is_active", true);
  if (roomTypeId) unitsQuery = unitsQuery.eq("room_type_id", roomTypeId);

  const [{ data: units, error: unitsError }, { data: blocked, error: blockedError }] = await Promise.all([
    unitsQuery,
    db.rpc("get_blocked_unit_ids", { p_check_in: checkIn, p_check_out: checkOut }),
  ]);
  if (unitsError || blockedError) {
    console.error("availability failed", unitsError ?? blockedError);
    return NextResponse.json({ error: "Availability check failed" }, { status: 502 });
  }

  const blockedIds = new Set((blocked ?? []).map((r) => r.room_unit_id));
  const available = (units ?? []).filter((u) => !blockedIds.has(u.id));

  return NextResponse.json({ units: available }, { headers: { "Cache-Control": "no-store" } });
}
