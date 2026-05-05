import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import type { GroupBooking, Reservation } from "@/lib/supabase-types";

export type RevPeriod = "today" | "week" | "month";

export type DashboardRecentItem = {
  id: string; type: "regular" | "group"; name: string;
  checkIn: string; checkOut: string; status: string;
  price: number; createdAt: string; source?: string;
};

function periodBounds(period: RevPeriod) {
  const now = new Date();
  switch (period) {
    case "today": return { start: startOfDay(now),   end: endOfDay(now) };
    case "week":  return { start: startOfWeek(now),  end: endOfWeek(now) };
    case "month": return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function useAdminDashboardStats(revPeriod: RevPeriod) {
  return useQuery({
    queryKey: QK.adminStats(revPeriod),
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { start, end } = periodBounds(revPeriod);

      const { data: reservations, error } = await supabase.from("reservations").select("*");
      if (error) throw error;
      const all = (reservations as Reservation[]).filter(r => (r as any).type !== "banquet");

      const unprocessed   = all.filter(r => r.status === "UNPROCESSED").length;
      const pending       = all.filter(r => r.status === "PENDING").length;
      const confirmed     = all.filter(r => r.status === "CONFIRMED").length;
      const todayCheckIns = all.filter(
        r => r.check_in_date === today && (r.status === "CONFIRMED" || r.status === "CHECK_IN"),
      ).length;
      const earnedRevenue = all
        .filter(r => {
          if (r.status !== "CHECK_IN" && r.status !== "CHECK_OUT") return false;
          const d = new Date(r.check_in_date);
          return d >= start && d <= end;
        })
        .reduce((sum, r) => sum + Number(r.total_price), 0);

      const { data: groupData } = await supabase.from("group_bookings").select("*");
      const allGroups = (groupData ?? []) as GroupBooking[];

      const regularItems: DashboardRecentItem[] = all.map(r => ({
        id: r.id, type: "regular", name: r.guest_name,
        checkIn: r.check_in_date, checkOut: r.check_out_date,
        status: r.status, price: Number(r.total_price),
        createdAt: r.created_at, source: r.booking_source,
      }));
      const groupItems: DashboardRecentItem[] = allGroups.map(g => ({
        id: g.id, type: "group", name: g.booking_name,
        checkIn: g.check_in_date, checkOut: g.check_out_date,
        status: g.status, price: Number(g.total_price),
        createdAt: g.created_at,
      }));
      const recentBookings = [...regularItems, ...groupItems]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { unprocessed, pending, confirmed, todayCheckIns, earnedRevenue, recentBookings };
    },
  });
}

export function useAdminDashboardGroupStats(revPeriod: RevPeriod) {
  return useQuery({
    queryKey: QK.adminGroupStats(revPeriod),
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { start, end } = periodBounds(revPeriod);

      const { data, error } = await supabase.from("group_bookings").select("*");
      if (error) throw error;
      const all = data as GroupBooking[];

      const groupPending   = all.filter(g => g.status === "PENDING").length;
      const groupCheckIns  = all.filter(
        g => g.check_in_date === today && (g.status === "CONFIRMED" || g.status === "CHECK_IN"),
      ).length;
      const groupRevenue   = all
        .filter(g => {
          if (g.status !== "CHECK_IN" && g.status !== "CHECK_OUT") return false;
          const d = new Date(g.check_in_date);
          return d >= start && d <= end;
        })
        .reduce((sum, g) => sum + Number(g.total_price), 0);

      return { groupPending, groupCheckIns, groupRevenue };
    },
  });
}
