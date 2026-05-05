import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, parseISO } from "date-fns";
import { TrendingUp, BedDouble, DollarSign, Users, CreditCard, CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hotelConfig } from "@/config/hotel";
import { useLanguage } from "@/i18n/LanguageContext";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { useOwnerMonthReservations, useOwnerLast6Reservations, useOwnerRoomUnitsCount } from "@/hooks/useOwnerDashboardData";

export default function AdminOwnerDashboard() {
  const { t } = useLanguage();
  const { data: hotelSettings } = useHotelSettings();
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd   = format(endOfMonth(now),   "yyyy-MM-dd");

  const { data: monthReservations, isLoading } = useOwnerMonthReservations(monthStart, monthEnd);
  const { data: last6Months }                  = useOwnerLast6Reservations();
  const { data: roomUnits }                    = useOwnerRoomUnitsCount();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.ownerDashboard")}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const totalRooms = roomUnits?.length ?? 0;
  const capacity   = hotelSettings?.total_capacity ?? totalRooms;

  const totalRevenue = (monthReservations ?? []).reduce((s, r) =>
    s + Number(r.total_price) + Number(r.tourist_tax_amount ?? 0)
      + Number(r.early_checkin_fee ?? 0) + Number(r.late_checkout_fee ?? 0), 0);

  const totalPrepayment = (monthReservations ?? []).reduce((s, r) =>
    s + (r.deposit_amount ? Number(r.deposit_amount) : 0), 0);

  const daysInMonth = differenceInDays(endOfMonth(now), startOfMonth(now)) + 1;
  const availableRoomNights = totalRooms * daysInMonth;
  const occupiedNights = (monthReservations ?? []).reduce((s, r) => {
    const ci = parseISO(r.check_in_date as string);
    const co = parseISO((r as any).check_out_date as string);
    return s + Math.max(0, differenceInDays(co, ci));
  }, 0);
  const occupancyRate = availableRoomNights > 0 ? (occupiedNights / availableRoomNights) * 100 : 0;
  const bookingsCount = monthReservations?.length ?? 0;
  const adr = occupiedNights > 0 ? (monthReservations ?? []).reduce((s, r) => s + Number(r.total_price), 0) / occupiedNights : 0;

  // ── Monthly trend data ───────────────────────────────────────────────────────
  const monthlyData: Record<string, { revenue: number; bookings: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const key = format(d, "MMM yyyy");
    monthlyData[key] = { revenue: 0, bookings: 0 };
  }
  for (const r of last6Months ?? []) {
    const key = format(parseISO(r.check_in_date as string), "MMM yyyy");
    if (monthlyData[key]) {
      monthlyData[key].revenue  += Number(r.total_price);
      monthlyData[key].bookings += 1;
    }
  }
  const chartData = Object.entries(monthlyData).map(([month, v]) => ({ month, ...v }));

  const metrics = [
    {
      icon: DollarSign,
      label: t("owner.totalRevenue"),
      value: `${hotelConfig.currencySymbol}${Math.round(totalRevenue).toLocaleString()}`,
      sub: t("owner.thisMonth"),
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      icon: CreditCard,
      label: t("owner.prepayment"),
      value: `${hotelConfig.currencySymbol}${Math.round(totalPrepayment).toLocaleString()}`,
      sub: t("owner.thisMonth"),
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: TrendingUp,
      label: t("owner.occupancy"),
      value: `${occupancyRate.toFixed(1)}%`,
      sub: `${occupiedNights} / ${availableRoomNights} ${t("owner.nightsUnit")}`,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: CalendarCheck,
      label: t("owner.bookingsCount"),
      value: String(bookingsCount),
      sub: t("owner.thisMonth"),
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      icon: BedDouble,
      label: "ADR",
      value: `${hotelConfig.currencySymbol}${Math.round(adr).toLocaleString()}`,
      sub: t("owner.avgDailyRate"),
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: Users,
      label: t("owner.capacity"),
      value: String(capacity),
      sub: t("owner.totalGuests"),
      color: "text-stone-600",
      bg: "bg-stone-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("admin.ownerDashboard")}</h1>
        <p className="text-muted-foreground">{format(now, "MMMM yyyy")}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${m.bg}`}>
                    <Icon className={`h-5 w-5 ${m.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                    <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-xs text-muted-foreground">{m.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("owner.revenueTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${hotelConfig.currencySymbol}${v.toLocaleString()}`, t("owner.totalRevenue")]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("owner.bookingsTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, t("owner.bookingsCount")]} />
                <Line type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sales progress toward capacity */}
      {capacity > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("owner.salesProgress")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("owner.occupancy")}</span>
              <span className="font-semibold">{occupancyRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, occupancyRate)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {occupiedNights} {t("owner.nightsUnit")} {t("owner.of")} {availableRoomNights} {t("owner.available")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
