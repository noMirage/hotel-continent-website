import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { QK } from "@/lib/queryKeys";
import { toLocalDateString } from "@/lib/date-utils";

export function useAvailability(
  roomTypeId: string | undefined,
  checkIn: Date | undefined,
  checkOut: Date | undefined
) {
  return useQuery({
    queryKey: QK.availability(roomTypeId, checkIn ? toLocalDateString(checkIn) : undefined, checkOut ? toLocalDateString(checkOut) : undefined),
    queryFn: async () => {
      if (!roomTypeId || !checkIn || !checkOut) return [];

      const checkInStr = format(checkIn, "yyyy-MM-dd");
      const checkOutStr = format(checkOut, "yyyy-MM-dd");

      // Get all room units for this room type (public RLS allows anonymous read)
      const { data: units, error: unitsError } = await supabase
        .from("room_units")
        .select("id, room_number")
        .eq("room_type_id", roomTypeId)
        .eq("is_active", true);

      if (unitsError) throw unitsError;
      if (!units?.length) return [];

      // Use SECURITY DEFINER RPC — works for anonymous visitors without
      // exposing guest PII (reservations table SELECT requires admin auth).
      const { data: blocked, error: blockedError } = await (supabase as any)
        .rpc("get_blocked_unit_ids", { p_check_in: checkInStr, p_check_out: checkOutStr });

      if (blockedError) throw blockedError;

      const bookedUnitIds = new Set<string>((blocked ?? []).map((r: { room_unit_id: string }) => r.room_unit_id));

      return units.filter(unit => !bookedUnitIds.has(unit.id));
    },
    enabled: !!roomTypeId && !!checkIn && !!checkOut,
  });
}
