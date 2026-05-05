import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import type { RoomType, RoomTypeGuestPrice } from "@/lib/supabase-types";

export function useAdminRoomTypes() {
  return useQuery({
    queryKey: QK.adminRoomTypes(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_types").select("*").order("sort_order");
      if (error) throw error;
      return data as RoomType[];
    },
  });
}

export function useRoomTypeGuestPrices(roomTypeId: string | undefined) {
  return useQuery({
    queryKey: QK.roomTypeGuestPrices(roomTypeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_type_guest_prices").select("*")
        .eq("room_type_id", roomTypeId!).order("guest_count");
      if (error) throw error;
      return data as RoomTypeGuestPrice[];
    },
    enabled: !!roomTypeId,
  });
}
