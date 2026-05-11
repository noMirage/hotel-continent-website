import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";

export function useAnalyticsReservations(from: string, to: string) {
  return useQuery({
    queryKey: QK.analyticsReservations(from, to),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .in("status", ["CONFIRMED", "CHECK_IN", "CHECK_OUT"])
        .gte("check_in_date", from)
        .lte("check_in_date", to);
      if (error) throw error;
      return data;
    },
  });
}

export function useAnalyticsGroupBookings(from: string, to: string) {
  return useQuery({
    queryKey: QK.analyticsGroupBookings(from, to),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_bookings")
        .select("check_in_date, check_out_date, total_price, deposit_amount, num_guests, room_unit_ids, status")
        .in("status", ["CONFIRMED", "CHECK_IN", "CHECK_OUT"])
        .gte("check_in_date", from)
        .lte("check_in_date", to);
      if (error) throw error;
      return data;
    },
  });
}

export function useAnalyticsRoomUnits() {
  return useQuery({
    queryKey: QK.analyticsRoomUnits(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_units").select("id").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });
}
