import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GroupBookingRoomAssignment, RoomUnit } from "@/lib/supabase-types";
import { getConflictingRooms } from "@/lib/booking-conflicts";
import { QK } from "@/lib/queryKeys";

export type RoomUnitFull = RoomUnit & {
  room_type: { name: string; name_uk?: string | null; max_guests: number };
  extra_accommodation_enabled: boolean;
  extra_accommodation_max: number;
};

export function useGroupBookingRoomUnits(enabled: boolean) {
  return useQuery({
    queryKey: QK.adminCalendarRooms(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_units")
        .select("*, room_type:room_types(name, name_uk, max_guests)")
        .eq("is_active", true)
        .order("room_number");
      if (error) throw error;
      return data as RoomUnitFull[];
    },
    enabled,
  });
}

export function useGroupBookingAssignments(bookingId: string | undefined) {
  return useQuery({
    queryKey: QK.groupRoomAssignments(bookingId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_booking_room_assignments")
        .select("*")
        .eq("group_booking_id", bookingId!);
      if (error) throw error;
      return data as GroupBookingRoomAssignment[];
    },
    enabled: !!bookingId,
  });
}

export function useGroupBookingCalc(calculationId: string | undefined) {
  return useQuery({
    queryKey: QK.groupCalcForBooking(calculationId),
    queryFn: async () => {
      if (!calculationId) return null;
      const { data, error } = await supabase
        .from("group_calculations")
        .select("price_per_person_per_night")
        .eq("id", calculationId)
        .single();
      if (error) return null;
      return data as { price_per_person_per_night: number };
    },
    enabled: !!calculationId,
  });
}

export function useRoomConflictsForGroup(
  bookingId: string | undefined,
  checkIn: string,
  checkOut: string,
  allRoomUnitIds: string[],
) {
  return useQuery({
    queryKey: QK.roomConflictsForGroup(bookingId, checkIn, checkOut),
    queryFn: async () => {
      if (!allRoomUnitIds.length || !checkIn || !checkOut) return [];
      return getConflictingRooms(allRoomUnitIds, checkIn, checkOut, undefined, bookingId!);
    },
    enabled: !!bookingId && !!checkIn && !!checkOut && !!allRoomUnitIds.length,
  });
}
