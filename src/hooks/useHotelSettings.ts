import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HotelSettings } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";
import { hotelConfig } from "@/config/hotel";

export function useHotelSettings() {
  const query = useQuery({
    queryKey: QK.hotelSettings(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as HotelSettings | null;
    },
    staleTime: 10 * 60 * 1000,
  });

  const s = query.data;
  return {
    ...query,
    hotelName:   s?.hotel_name    ?? hotelConfig.name,
    phone:       s?.phone         ?? hotelConfig.phone,
    email:       s?.email         ?? hotelConfig.email,
    address:     s?.address       ?? hotelConfig.address,
    checkInTime: s?.check_in_time ?? hotelConfig.checkInTime,
  };
}
