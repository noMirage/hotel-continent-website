import { useState } from "react";
import {
  format, startOfMonth, endOfMonth, subMonths, differenceInDays, parseISO,
  startOfYear, endOfYear,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { hotelConfig } from "@/config/hotel";
import { useLanguage } from "@/i18n/LanguageContext";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { useAnalyticsReservations, useAnalyticsRoomUnits } from "@/hooks/useAdminAnalyticsData";

const COLORS = ["hsl(var(--primary))", "#6366f1", "#10b981", "#f59e0b", "#ef4444"];

type Period = "this_month" | "last_month" | "this_year" | "last_6";

export default function AdminAnalytics() {
  const { t } = useLanguage();
  const { data: hotelSettings } = useHotelSettings();
  const [period, setPeriod] = useState<Period>("last_6");

  const now = new Date();

  function dateRange(p: Period): { from: string; to: string } {
    switch (p) {
      case "this_month":
        return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
      case "last_month": {
        const lm = subMonths(now, 1);
        return { from: format(startOfMonth(lm), "yyyy-MM-dd"), to: format(endOfMonth(lm), "yyyy-MM-dd") };
      }
      case "this_year":
        return { from: format(startOfYear(now), "yyyy-MM-dd"), to: format(endOfYear(now), "yyyy-MM-dd") };
      case "last_6":
      default:
        return { from: format(subMonths(now, 5), "yyyy-MM-01"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    }
  }

  const { from, to } = dateRange(period);

  const { data: reservations, isLoading } = useAnalyticsReservations(from, to);
  const { data: roomUnits } = useAnalyticsRoomUnits();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.analytics")}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const totalRooms = roomUnits?.length ?? 1;
  const rows = reservations ?? [];

  // ── Core Metrics ─────────────────────────────────────────────────────────────
  const totalRoomRevenue = rows.reduce((s, r) => s + Number(r.total_price), 0);
  const totalRevenue     = rows.reduce((s, r) =>
    s + Number(r.total_price) + Number(r.tourist_tax_amount ?? 0)
      + Number((r as any).early_checkin_fee ?? 0) + Number((r as any).late_checkout_fee ?? 0), 0);
  const totalPrepayment  = rows.reduce((s, r) => s + Number(r.deposit_amount ?? 0), 0);

  const occupiedNights = rows.reduce((s, r) => {
    const ci = parseISO(r.check_in_date as string);
    const co = parseISO(r.check_out_date as string);
    return s + Math.max(0, differenceInDays(co, ci));
  }, 0);

  const fromDate = parseISO(from);
  const toDate   = parseISO(to);
  const totalDays = Math.max(1, differenceInDays(toDate, fromDate) + 1);
  const availableRoomNights = totalRooms * totalDays;
  const occupancyRate = (occupiedNights / availableRoomNights) * 100;
  const adr    = occupiedNights > 0 ? totalRoomRevenue / occupiedNights : 0;
  const revpar = totalRoomRevenue / availableRoomNights;
  const trevpar = totalRevenue / availableRoomNights;
  const alos  = rows.length > 0 ? occupiedNights / rows.length : 0;

  // ── Monthly breakdown for charts ─────────────────────────────────────────────
  const monthMap: Record<string, { revenue: number; bookings: number; nights: number }> = {};
  const numMonths = period === "last_6" ? 6 : period === "this_year" ? 12 : 1;
  for (let i = numMonths - 1; i >= 0; i--) {
    const key = format(subMonths(period === "last_month" ? subMonths(now, 1) : now, i), "MMM yy");
    monthMap[key] = { revenue: 0, bookings: 0, nights: 0 };
  }
  for (const r of rows) {
    const key = format(parseISO(r.check_in_date as string), "MMM yy");
    if (monthMap[key]) {
      monthMap[key].revenue   += Number(r.total_price);
      monthMap[key].bookings  += 1;
      monthMap[key].nights    += Math.max(0, differenceInDays(parseISO(r.check_out_date as string), parseISO(r.check_in_date as string)));
    }
  }
  const monthlyChart = Object.entries(monthMap).map(([month, v]) => ({
    month, ...v,
    occupancy: availableRoomNights > 0 ? ((v.nights / (totalRooms * 30)) * 100) : 0,
  }));

  // ── Channel mix ───────────────────────────────────────────────────────────────
  const channelMap: Record<string, number> = {};
  for (const r of rows) {
    const src = (r.booking_source as string) ?? "SITE";
    channelMap[src] = (channelMap[src] ?? 0) + 1;
  }
  const channelData = Object.entries(channelMap).map(([name, value]) => ({ name, value }));

  const metrics: { label: string; value: string; desc: string; info: string }[] = [
    { label: t("analytics.occupancyRate"), value: `${occupancyRate.toFixed(1)}%`,    desc: `${occupiedNights} ${t("analytics.occupiedNights")}`, info: t("analytics.info.occupancy") },
    { label: "ADR",             value: `${hotelConfig.currencySymbol}${Math.round(adr).toLocaleString()}`,    desc: t("analytics.adrDesc"), info: t("analytics.info.adr") },
    { label: "RevPAR",          value: `${hotelConfig.currencySymbol}${Math.round(revpar).toLocaleString()}`, desc: t("analytics.revparDesc"), info: t("analytics.info.revpar") },
    { label: "TRevPAR",         value: `${hotelConfig.currencySymbol}${Math.round(trevpar).toLocaleString()}`, desc: t("analytics.trevparDesc"), info: t("analytics.info.trevpar") },
    { label: "ALOS",            value: `${alos.toFixed(1)} ${t("analytics.nights")}`, desc: t("analytics.alosDesc"), info: t("analytics.info.alos") },
    { label: t("analytics.totalRevenue"),   value: `${hotelConfig.currencySymbol}${Math.round(totalRevenue).toLocaleString()}`, desc: t("analytics.totalRevenueDesc"), info: t("analytics.info.revenue") },
    { label: t("analytics.prepayments"),    value: `${hotelConfig.currencySymbol}${Math.round(totalPrepayment).toLocaleString()}`, desc: t("analytics.prepaymentsDesc"), info: t("analytics.info.prepayment") },
    { label: t("analytics.bookingsCount"), value: String(rows.length), desc: t("analytics.bookingsCountDesc"), info: t("analytics.info.bookings") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.analytics")}</h1>
          <p className="text-muted-foreground">{t("analytics.subtitle")}</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">{t("analytics.thisMonth")}</SelectItem>
            <SelectItem value="last_month">{t("analytics.lastMonth")}</SelectItem>
            <SelectItem value="last_6">{t("analytics.last6Months")}</SelectItem>
            <SelectItem value="this_year">{t("analytics.thisYear")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* "Big Three" + Extended KPIs */}
      <TooltipProvider>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <Card key={m.label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground/60 hover:text-muted-foreground transition-colors flex-shrink-0">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
                      {m.info}
                    </TooltipContent>
                  </UITooltip>
                </div>
                <p className="text-xl font-bold text-foreground mt-0.5">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TooltipProvider>

      {/* Revenue & Occupancy trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.revenueByMonth")}</CardTitle>
            <CardDescription>Room revenue only</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${hotelConfig.currencySymbol}${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.occupancyTrend")}</CardTitle>
            <CardDescription>Based on occupied room nights</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Occupancy"]} />
                <Line type="monotone" dataKey="occupancy" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Channel mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.channelMix")}</CardTitle>
            <CardDescription>{t("analytics.channelMixDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v: number) => [v, "Bookings"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.bookingsByMonth")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, "Bookings"]} />
                <Bar dataKey="bookings" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Metrics reference table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("analytics.metricsReference")}</CardTitle>
          <CardDescription>{t("analytics.metricsReferenceDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {[
              { name: "Occupancy Rate", formula: "Occupied Rooms ÷ Available Rooms × 100", value: `${occupancyRate.toFixed(2)}%` },
              { name: "ADR", formula: "Room Revenue ÷ Rooms Sold", value: `${hotelConfig.currencySymbol}${adr.toFixed(2)}` },
              { name: "RevPAR", formula: "ADR × Occupancy Rate", value: `${hotelConfig.currencySymbol}${revpar.toFixed(2)}` },
              { name: "TRevPAR", formula: "Total Revenue ÷ Available Rooms", value: `${hotelConfig.currencySymbol}${trevpar.toFixed(2)}` },
              { name: "ALOS", formula: "Occupied Nights ÷ Bookings", value: `${alos.toFixed(2)} nights` },
            ].map(m => (
              <div key={m.name} className="bg-muted/40 rounded-lg p-3">
                <p className="font-semibold text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.formula}</p>
                <p className="text-primary font-medium mt-1">{m.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
