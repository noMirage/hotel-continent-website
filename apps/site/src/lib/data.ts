import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { HotelSettings, Promotion, RoomType, RoomTypeGuestPrice } from "@continent/shared/supabase-types";
import { supabase } from "./supabase";

// Cached public content. Pages are prerendered with this data and refreshed when the
// admin panel changes it: a Supabase Database Webhook calls /api/revalidate with the tag.
// cacheLife("hours") is a safety net in case a webhook is missed.

export const CACHE_TAGS = {
  rooms: "rooms",
  settings: "settings",
  promotions: "promotions",
} as const;

export interface RoomPhoto {
  room_type_id: string;
  url: string;
  alt_text: string | null;
}

export async function getRoomTypes(): Promise<RoomType[]> {
  "use cache";
  cacheTag(CACHE_TAGS.rooms);
  cacheLife("hours");
  const { data, error } = await supabase()
    .from("room_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data as RoomType[];
}

export async function getGuestPrices(): Promise<RoomTypeGuestPrice[]> {
  "use cache";
  cacheTag(CACHE_TAGS.rooms);
  cacheLife("hours");
  const { data, error } = await supabase().from("room_type_guest_prices").select("*");
  if (error) throw error;
  return data as RoomTypeGuestPrice[];
}

export async function getRoomPhotos(): Promise<RoomPhoto[]> {
  "use cache";
  cacheTag(CACHE_TAGS.rooms);
  cacheLife("hours");
  const { data, error } = await supabase()
    .from("room_media")
    .select("room_type_id, url, alt_text")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getHotelSettings(): Promise<HotelSettings | null> {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cacheLife("hours");
  const { data, error } = await supabase().from("hotel_settings").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data as HotelSettings | null;
}

export async function getActivePromotions(): Promise<Promotion[]> {
  "use cache";
  cacheTag(CACHE_TAGS.promotions);
  cacheLife("hours");
  const { data, error } = await supabase()
    .from("promotions")
    .select("id,title,title_uk,description,description_uk,badge,badge_uk,highlights,highlights_uk,discount_percent,valid_from,valid_to")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data as Promotion[];
}

/** Everything the client islands need, loaded once in the root layout. */
export async function getSiteData() {
  const [roomTypes, guestPrices, roomPhotos, hotelSettings, promotions] = await Promise.all([
    getRoomTypes(),
    getGuestPrices(),
    getRoomPhotos(),
    getHotelSettings(),
    getActivePromotions(),
  ]);
  return { roomTypes, guestPrices, roomPhotos, hotelSettings, promotions };
}

export type SiteData = Awaited<ReturnType<typeof getSiteData>>;

/** For the footer copyright; cached so prerendering does not read the clock on every render. */
export async function getCurrentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
