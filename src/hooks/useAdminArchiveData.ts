import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import type { Reservation } from "@/lib/supabase-types";

export interface ArchiveBooking extends Reservation {
  room_unit?: {
    room_number: string;
    room_type?: { name: string; name_uk: string | null } | null;
  } | null;
}

export function useAdminArchiveBookings(enabled = true) {
  return useQuery({
    queryKey: QK.adminArchive(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, room_unit:room_units(room_number, room_type:room_types(name, name_uk))")
        .eq("status", "CANCELLED")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as ArchiveBooking[];
    },
    enabled,
  });
}
