import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RoomType } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";

export function useRoomTypes() {
  return useQuery({
    queryKey: QK.roomTypes(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as RoomType[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useRoomType(slug: string) {
  return useQuery({
    queryKey: QK.roomType(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_types")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data as RoomType | null;
    },
    enabled: !!slug,
  });
}
