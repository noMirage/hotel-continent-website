import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import type { HotelSettings } from "@/lib/supabase-types";

export function useAdminHotelSettings() {
  return useQuery({
    queryKey: QK.adminHotelSettings(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as HotelSettings | null;
    },
  });
}

export function useSettingsRoomCapacity() {
  return useQuery({
    queryKey: QK.settingsRoomCapacity(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_units")
        .select("id, room_type:room_types(max_guests)")
        .eq("is_active", true);
      if (error) throw error;
      return data as Array<{ id: string; room_type: { max_guests: number } | null }>;
    },
  });
}
