import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Reservation, GroupBooking, GuestForm } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";

export function useAdminProfilesLookup() {
  return useQuery({
    queryKey: QK.adminProfilesLookup(),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name");
      if (error) throw error;
      const map = new Map<string, string>();
      for (const p of data ?? []) if (p.user_id && p.full_name) map.set(p.user_id, p.full_name);
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoomUnitsForOccupancy() {
  return useQuery({
    queryKey: QK.roomUnitsForOccupancy(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_units")
        .select("id, room_number")
        .eq("is_active", true);
      if (error) throw error;
      return data as { id: string; room_number: string }[];
    },
  });
}

export function useGroupBookingsForOccupancy() {
  return useQuery({
    queryKey: QK.groupBookingsForOccupancy(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_bookings")
        .select("room_unit_ids, check_in_date, check_out_date, status");
      if (error) throw error;
      return data as Pick<GroupBooking, "room_unit_ids" | "check_in_date" | "check_out_date" | "status">[];
    },
  });
}

export function useAdminBookingsList() {
  return useQuery({
    queryKey: QK.adminBookings(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Reservation[];
    },
  });
}

export function useGuestFormForDelete(reservationId: string | undefined) {
  return useQuery<GuestForm | null>({
    queryKey: QK.guestForm(reservationId),
    queryFn: async () => {
      if (!reservationId) return null;
      const { data, error } = await supabase
        .from("guest_forms")
        .select("*")
        .eq("reservation_id", reservationId)
        .maybeSingle();
      if (error) throw error;
      return data as GuestForm | null;
    },
    enabled: !!reservationId,
  });
}
