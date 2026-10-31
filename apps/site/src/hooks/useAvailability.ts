"use client";

import { useQuery } from "@tanstack/react-query";
import { toLocalDateString } from "@continent/shared/date-utils";

export interface AvailableUnit {
  id: string;
  room_number: string;
  room_type_id: string;
}

export async function fetchAvailableUnits(checkIn: string, checkOut: string, roomTypeId?: string): Promise<AvailableUnit[]> {
  const qs = new URLSearchParams({ checkIn, checkOut });
  if (roomTypeId) qs.set("roomTypeId", roomTypeId);
  const res = await fetch(`/api/availability?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Availability check failed (${res.status})`);
  return (await res.json()).units as AvailableUnit[];
}

/** Free units of one room type for the stay (same shape as the admin app's hook). */
export function useAvailability(roomTypeId: string | undefined, checkIn: Date | undefined, checkOut: Date | undefined) {
  const ci = checkIn ? toLocalDateString(checkIn) : undefined;
  const co = checkOut ? toLocalDateString(checkOut) : undefined;
  return useQuery({
    queryKey: ["availability", roomTypeId, ci, co],
    queryFn: () => fetchAvailableUnits(ci!, co!, roomTypeId),
    enabled: !!roomTypeId && !!ci && !!co,
  });
}
