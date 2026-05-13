import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import type { Reservation, RoomUnit, GroupBooking } from "@/lib/supabase-types";
import { CALENDAR_STATUSES } from "@/lib/booking-status";

export type CalendarRoomUnit = RoomUnit & {
  room_type: { name: string; name_uk?: string | null; max_guests: number };
  extra_accommodation_enabled: boolean;
  extra_accommodation_max: number;
};

export function useCalendarRooms() {
  return useQuery({
    queryKey: QK.adminCalendarRooms(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_units")
        .select("*, room_type:room_types(name, name_uk, max_guests)")
        .eq("is_active", true)
        .order("room_number");
      if (error) throw error;
      return data as CalendarRoomUnit[];
    },
  });
}

export function useCalendarReservations(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: QK.adminCalendarReservations(
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd")
    ),
    queryFn: async () => {
      const s = format(startDate, "yyyy-MM-dd");
      const e = format(endDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .in("status", CALENDAR_STATUSES as unknown as string[])
        .lte("check_in_date", e)
        .gte("check_out_date", s);
      if (error) throw error;
      return data as Reservation[];
    },
  });
}

export function useCalendarGroupBookings(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: QK.adminCalendarGroupBookings(
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd")
    ),
    queryFn: async () => {
      const s = format(startDate, "yyyy-MM-dd");
      const e = format(endDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("group_bookings")
        .select("*, room_assignments:group_booking_room_assignments(room_unit_id, early_checkin_fee, late_checkout_fee, check_in_override, check_out_override)")
        .not("status", "eq", "CANCELLED")
        .lte("check_in_date", e)
        .gte("check_out_date", s);
      if (error) throw error;
      return data as GroupBooking[];
    },
  });
}
