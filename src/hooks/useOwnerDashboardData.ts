import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";

export function useOwnerMonthReservations(monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: QK.ownerMonthReservations(monthStart),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .in("status", ["CONFIRMED", "CHECK_IN", "CHECK_OUT"])
        .gte("check_in_date", monthStart)
        .lte("check_in_date", monthEnd);
      if (error) throw error;
      return data;
    },
  });
}

export function useOwnerLast6Reservations() {
  return useQuery({
    queryKey: QK.ownerLast6Reservations(),
    queryFn: async () => {
      const sixMonthsAgo = format(subMonths(new Date(), 5), "yyyy-MM-01");
      const { data, error } = await supabase
        .from("reservations")
        .select("check_in_date, total_price, deposit_amount, tourist_tax_amount, early_checkin_fee, late_checkout_fee, num_guests")
        .in("status", ["CONFIRMED", "CHECK_IN", "CHECK_OUT"])
        .gte("check_in_date", sixMonthsAgo);
      if (error) throw error;
      return data;
    },
  });
}

export function useOwnerRoomUnitsCount() {
  return useQuery({
    queryKey: QK.ownerRoomUnitsCount(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_units").select("id").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });
}
