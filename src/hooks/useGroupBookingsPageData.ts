import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GroupBooking, GroupBookingRequest, GroupCalculation } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";

export function useGroupBookingsList() {
  return useQuery({
    queryKey: QK.groupBookings(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_bookings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as GroupBooking[];
    },
  });
}

export function useGroupBookingRequestsList() {
  return useQuery({
    queryKey: QK.groupBookingRequests(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_booking_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as GroupBookingRequest[];
    },
  });
}

export function useGroupCalculationsList() {
  return useQuery({
    queryKey: QK.groupCalculations(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_calculations")
        .select("*, services:group_calculation_services(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GroupCalculation[];
    },
  });
}
