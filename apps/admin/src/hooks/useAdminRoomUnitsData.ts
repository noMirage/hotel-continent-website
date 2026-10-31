import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";

export function useRoomUnitsSummary() {
  return useQuery({
    queryKey: QK.roomUnitsSummary(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_units")
        .select("id, is_active, room_type:room_types(name)")
        .order("room_number");
      if (error) throw error;
      const active = (data as any[]).filter(u => u.is_active).length;
      return { total: data.length, active };
    },
  });
}
