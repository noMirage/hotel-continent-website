import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { QK } from "@/lib/queryKeys";

export function useAvailability(
  roomTypeId: string | undefined,
  checkIn: Date | undefined,
  checkOut: Date | undefined
) {
  return useQuery({
    queryKey: QK.availability(roomTypeId, checkIn?.toISOString(), checkOut?.toISOString()),
    queryFn: async () => {
      if (!roomTypeId || !checkIn || !checkOut) return [];
      
      const checkInStr = format(checkIn, "yyyy-MM-dd");
      const checkOutStr = format(checkOut, "yyyy-MM-dd");
      
      // Get all room units for this room type
      const { data: units, error: unitsError } = await supabase
        .from("room_units")
        .select("id, room_number")
        .eq("room_type_id", roomTypeId)
        .eq("is_active", true);
      
      if (unitsError) throw unitsError;
      if (!units?.length) return [];
      
      // Get reservations that overlap with the requested dates
      // UNPROCESSED is treated as blocking to prevent double-offers
      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select("room_unit_id")
        .in("room_unit_id", units.map(u => u.id))
        .in("status", ["UNPROCESSED", "PENDING", "CONFIRMED", "CHECK_IN"])
        .or(`and(check_in_date.lt.${checkOutStr},check_out_date.gt.${checkInStr})`);
      
      if (resError) throw resError;
      
      const bookedUnitIds = new Set(reservations?.map(r => r.room_unit_id) || []);
      
      // Return available units
      return units.filter(unit => !bookedUnitIds.has(unit.id));
    },
    enabled: !!roomTypeId && !!checkIn && !!checkOut,
  });
}
