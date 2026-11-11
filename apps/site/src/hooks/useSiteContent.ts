"use client";

import { useMemo } from "react";
import { hotelConfig } from "@continent/shared/hotel-config";
import { useSiteData } from "@/components/providers/SiteDataProvider";

// Query-shaped hooks over the server-provided site data, so components ported from the
// admin app (which used React Query) keep their `{ data, isLoading, error }` usage.

const loaded = <T,>(data: T) => ({ data, isLoading: false as const, error: null });

export function useRoomTypes() {
  return loaded(useSiteData().roomTypes);
}

export function useRoomType(slug: string | undefined) {
  const { roomTypes } = useSiteData();
  return loaded(roomTypes.find((r) => r.slug === slug) ?? null);
}

export function useGuestPrices(roomTypeId?: string) {
  const { guestPrices } = useSiteData();
  return loaded(useMemo(
    () => (roomTypeId ? guestPrices.filter((p) => p.room_type_id === roomTypeId) : guestPrices),
    [guestPrices, roomTypeId],
  ));
}

export function useRoomPhotos(roomTypeId: string) {
  const { roomPhotos } = useSiteData();
  return loaded(useMemo(() => roomPhotos.filter((p) => p.room_type_id === roomTypeId), [roomPhotos, roomTypeId]));
}

export function usePromotions() {
  return loaded(useSiteData().promotions);
}

export function useHotelSettings() {
  const s = useSiteData().hotelSettings;
  return {
    ...loaded(s),
    hotelName:   s?.hotel_name    ?? hotelConfig.name,
    phone:       s?.phone         ?? hotelConfig.phone,
    email:       s?.email         ?? hotelConfig.email,
    address:     s?.address       ?? hotelConfig.address,
    checkInTime: s?.check_in_time ?? hotelConfig.checkInTime,
  };
}
