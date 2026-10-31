import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { CACHE_TAGS } from "@/lib/data";

// Called by Supabase Database Webhooks (Database → Webhooks) whenever the admin panel
// changes public content. Each webhook sends header `x-revalidate-secret: $REVALIDATE_SECRET`
// and Supabase's standard payload `{ type, table, schema, record, old_record }`.
const TABLE_TAGS: Record<string, string> = {
  room_types: CACHE_TAGS.rooms,
  room_type_guest_prices: CACHE_TAGS.rooms,
  room_media: CACHE_TAGS.rooms,
  room_units: CACHE_TAGS.rooms,
  hotel_settings: CACHE_TAGS.settings,
  promotions: CACHE_TAGS.promotions,
};

function authorized(request: NextRequest): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  const given = request.headers.get("x-revalidate-secret");
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { table?: string; tag?: string } | null;
  // `tag` allows a manual flush: { "tag": "rooms" }
  const tag = payload?.tag ?? (payload?.table ? TABLE_TAGS[payload.table] : undefined);
  if (!tag || !Object.values(CACHE_TAGS).includes(tag as never)) {
    return NextResponse.json({ error: "Unknown table or tag" }, { status: 400 });
  }

  // expire: 0 → the next visitor gets fresh prices instead of a stale page
  revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: tag });
}
