import React, { useState } from "react";
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
import {
  useAnalyticsReservations, useAnalyticsRoomUnits, useAnalyticsGroupBookings,
} from "@/hooks/useAdminAnalyticsData";

const PIE_COLORS = ["hsl(var(--primary))", "#6366f1", "#10b981", "#f59e0b", "#ef4444"];
const C = { standard: "hsl(var(--primary))", group: "#6366f1" };

type Period = "this_month" | "last_month" | "this_year" | "last_6";
type Tab    = "total" | "standard" | "group";

function TabSwitcher({
  tabs, activeTab, onTabChange,
}: {
  tabs: { key: Tab; label: string }[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-muted rounded-2xl p-1.5">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={[
            "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150",
            activeTab === key
              ? "bg-card text-foreground font-semibold shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({ label, value, desc, info }: { label: string; value: string; desc: string; info: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <UITooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground/60 hover:text-muted-foreground transition-colors flex-shrink-0">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
              {info}
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const { t } = useLanguage();
  const { data: hotelSettings } = useHotelSettings();
  const [period, setPeriod]   = useState<Period>("last_6");
  const [activeTab, setActiveTab] = useState<Tab>("total");

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

  const { data: reservations,  isLoading: isLoadingStd } = useAnalyticsReservations(from, to);
  const { data: groupBookings, isLoading: isLoadingGrp } = useAnalyticsGroupBookings(from, to);
  const { data: roomUnits } = useAnalyticsRoomUnits();

  if (isLoadingStd || isLoadingGrp) {
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
  const stdRows = reservations  ?? [];
  const grpRows = groupBookings ?? [];
  const cur     = hotelConfig.currencySymbol;
  const fmt     = (n: number) => `${cur}${Math.round(n).toLocaleString()}`;

  // ── Available room nights ─────────────────────────────────────────────────────
  const fromDate = parseISO(from);
  const toDate   = parseISO(to);
  const totalDays           = Math.max(1, differenceInDays(toDate, fromDate) + 1);
  const availableRoomNights = totalRooms * totalDays;

  // ── Standard metrics ──────────────────────────────────────────────────────────
  const stdRoomRevenue    = stdRows.reduce((s, r) => s + Number(r.total_price), 0);
  const stdRevenue        = stdRows.reduce((s, r) =>
    s + Number(r.total_price) + Number(r.tourist_tax_amount ?? 0)
      + Number((r as any).early_checkin_fee ?? 0) + Number((r as any).late_checkout_fee ?? 0), 0);
  const stdPrepayment     = stdRows.reduce((s, r) => s + Number(r.deposit_amount ?? 0), 0);
  const stdOccupiedNights = stdRows.reduce((s, r) => {
    const ci = parseISO(r.check_in_date as string);
    const co = parseISO(r.check_out_date as string);
    return s + Math.max(0, differenceInDays(co, ci));
  }, 0);
  const stdCount          = stdRows.length;
  const stdOccupancyRate  = (stdOccupiedNights / availableRoomNights) * 100;
  const stdADR            = stdOccupiedNights > 0 ? stdRoomRevenue / stdOccupiedNights : 0;
  const stdRevPAR         = stdRoomRevenue / availableRoomNights;
  const stdTRevPAR        = stdRevenue / availableRoomNights;
  const stdALOS           = stdCount > 0 ? stdOccupiedNights / stdCount : 0;

  // ── Group metrics ─────────────────────────────────────────────────────────────
  const grpRevenue        = grpRows.reduce((s, g) => s + Number(g.total_price), 0);
  const grpPrepayment     = grpRows.reduce((s, g) => s + Number(g.deposit_amount ?? 0), 0);
  const grpOccupiedNights = grpRows.reduce((s, g) => {
    const ci    = parseISO(g.check_in_date as string);
    const co    = parseISO(g.check_out_date as string);
    const nights = Math.max(0, differenceInDays(co, ci));
    const rooms  = ((g as any).room_unit_ids as string[] | null)?.length ?? 1;
    return s + nights * rooms;
  }, 0);
  const grpCount          = grpRows.length;
  const grpGuests         = grpRows.reduce((s, g) => s + Number(g.num_guests ?? 0), 0);
  const grpAvgSize        = grpCount > 0 ? Math.round(grpGuests / grpCount) : 0;
  const grpOccupancyRate  = (grpOccupiedNights / availableRoomNights) * 100;
  const grpADR            = grpOccupiedNights > 0 ? grpRevenue / grpOccupiedNights : 0;
  const grpRevPAR         = grpRevenue / availableRoomNights;
  const grpALOS           = grpCount > 0 ? grpOccupiedNights / grpCount : 0;

  // ── Combined metrics ──────────────────────────────────────────────────────────
  const totRevenue        = stdRevenue + grpRevenue;
  const totPrepayment     = stdPrepayment + grpPrepayment;
  const totOccupiedNights = stdOccupiedNights + grpOccupiedNights;
  const totOccupancyRate  = (totOccupiedNights / availableRoomNights) * 100;
  const totRoomRevenue    = stdRoomRevenue + grpRevenue;
  const totADR            = totOccupiedNights > 0 ? totRoomRevenue / totOccupiedNights : 0;
  const totRevPAR         = totRoomRevenue / availableRoomNights;
  const totTRevPAR        = totRevenue / availableRoomNights;
  const totCount          = stdCount + grpCount;
  const totALOS           = totCount > 0 ? totOccupiedNights / totCount : 0;

  // ── Monthly chart data ────────────────────────────────────────────────────────
  const numMonths = period === "last_6" ? 6 : period === "this_year" ? 12 : 1;
  const baseDate  = period === "last_month" ? subMonths(now, 1) : now;

  type MonthEntry = {
    stdRevenue: number; grpRevenue: number;
    stdBookings: number; grpBookings: number;
    stdNights: number; grpNights: number;
    grpGuests: number;
  };
  const monthMap: Record<string, MonthEntry> = {};
  for (let i = numMonths - 1; i >= 0; i--) {
    const key = format(subMonths(baseDate, i), "MMM yy");
    monthMap[key] = { stdRevenue: 0, grpRevenue: 0, stdBookings: 0, grpBookings: 0, stdNights: 0, grpNights: 0, grpGuests: 0 };
  }
  for (const r of stdRows) {
    const key = format(parseISO(r.check_in_date as string), "MMM yy");
    if (monthMap[key]) {
      monthMap[key].stdRevenue  += Number(r.total_price);
      monthMap[key].stdBookings += 1;
      monthMap[key].stdNights   += Math.max(0, differenceInDays(parseISO(r.check_out_date as string), parseISO(r.check_in_date as string)));
    }
  }
  for (const g of grpRows) {
    const key = format(parseISO(g.check_in_date as string), "MMM yy");
    if (monthMap[key]) {
      monthMap[key].grpRevenue  += Number(g.total_price);
      monthMap[key].grpBookings += 1;
      const nights = Math.max(0, differenceInDays(parseISO(g.check_out_date as string), parseISO(g.check_in_date as string)));
      const rooms  = ((g as any).room_unit_ids as string[] | null)?.length ?? 1;
      monthMap[key].grpNights  += nights * rooms;
      monthMap[key].grpGuests  += Number(g.num_guests ?? 0);
    }
  }
  const perMonth = totalRooms * 30;
  const monthlyChart = Object.entries(monthMap).map(([month, v]) => ({
    month, ...v,
    stdOccupancy: perMonth > 0 ? (v.stdNights / perMonth) * 100 : 0,
    grpOccupancy: perMonth > 0 ? (v.grpNights / perMonth) * 100 : 0,
  }));

  // ── Channel mix (standard only) ───────────────────────────────────────────────
  const channelMap: Record<string, number> = {};
  for (const r of stdRows) {
    const src = (r.booking_source as string) ?? "SITE";
    channelMap[src] = (channelMap[src] ?? 0) + 1;
  }
  const channelData = Object.entries(channelMap).map(([name, value]) => ({ name, value }));

  // ── KPI metrics per tab ───────────────────────────────────────────────────────
  const totalMetrics = [
    { label: t("analytics.occupancyRate"), value: `${totOccupancyRate.toFixed(1)}%`,       desc: `${totOccupiedNights} ${t("analytics.occupiedNights")}`, info: t("analytics.info.occupancy") },
    { label: "ADR",                        value: fmt(totADR),                               desc: t("analytics.adrDesc"),        info: t("analytics.info.adr") },
    { label: "RevPAR",                     value: fmt(totRevPAR),                            desc: t("analytics.revparDesc"),     info: t("analytics.info.revpar") },
    { label: "TRevPAR",                    value: fmt(totTRevPAR),                           desc: t("analytics.trevparDesc"),    info: t("analytics.info.trevpar") },
    { label: "ALOS",                       value: `${totALOS.toFixed(1)} ${t("analytics.nights")}`, desc: t("analytics.alosDesc"), info: t("analytics.info.alos") },
    { label: t("analytics.totalRevenue"),  value: fmt(totRevenue),                           desc: t("analytics.totalRevenueDesc"), info: t("analytics.info.revenue") },
    { label: t("analytics.prepayments"),   value: fmt(totPrepayment),                        desc: t("analytics.prepaymentsDesc"),  info: t("analytics.info.prepayment") },
    { label: t("analytics.bookingsCount"), value: String(totCount),                          desc: t("analytics.bookingsCountDesc"), info: t("analytics.info.bookings") },
  ];

  const stdMetrics = [
    { label: t("analytics.occupancyRate"), value: `${stdOccupancyRate.toFixed(1)}%`,       desc: `${stdOccupiedNights} ${t("analytics.occupiedNights")}`, info: t("analytics.info.occupancy") },
    { label: "ADR",                        value: fmt(stdADR),                              desc: t("analytics.adrDesc"),        info: t("analytics.info.adr") },
    { label: "RevPAR",                     value: fmt(stdRevPAR),                           desc: t("analytics.revparDesc"),     info: t("analytics.info.revpar") },
    { label: "TRevPAR",                    value: fmt(stdTRevPAR),                          desc: t("analytics.trevparDesc"),    info: t("analytics.info.trevpar") },
    { label: "ALOS",                       value: `${stdALOS.toFixed(1)} ${t("analytics.nights")}`, desc: t("analytics.alosDesc"), info: t("analytics.info.alos") },
    { label: t("analytics.totalRevenue"),  value: fmt(stdRevenue),                          desc: t("analytics.totalRevenueDesc"), info: t("analytics.info.revenue") },
    { label: t("analytics.prepayments"),   value: fmt(stdPrepayment),                       desc: t("analytics.prepaymentsDesc"),  info: t("analytics.info.prepayment") },
    { label: t("analytics.bookingsCount"), value: String(stdCount),                         desc: t("analytics.bookingsCountDesc"), info: t("analytics.info.bookings") },
  ];

  const grpMetrics = [
    { label: t("analytics.occupancyRate"), value: `${grpOccupancyRate.toFixed(1)}%`,       desc: `${grpOccupiedNights} ${t("analytics.occupiedNights")}`, info: t("analytics.info.occupancy") },
    { label: "ADR",                        value: fmt(grpADR),                              desc: t("analytics.adrDesc"),        info: t("analytics.info.adr") },
    { label: "RevPAR",                     value: fmt(grpRevPAR),                           desc: t("analytics.revparDesc"),     info: t("analytics.info.revpar") },
    { label: "ALOS",                       value: `${grpALOS.toFixed(1)} ${t("analytics.nights")}`, desc: t("analytics.alosDesc"), info: t("analytics.info.alos") },
    { label: t("analytics.totalRevenue"),  value: fmt(grpRevenue),                          desc: t("analytics.totalRevenueDesc"), info: t("analytics.info.revenue") },
    { label: t("analytics.prepayments"),   value: fmt(grpPrepayment),                       desc: t("analytics.prepaymentsDesc"),  info: t("analytics.info.prepayment") },
    { label: t("analytics.bookingsCount"), value: String(grpCount),                         desc: t("analytics.bookingsCountDesc"), info: t("analytics.info.groupCount") },
    { label: t("analytics.avgGroupSize"),  value: grpAvgSize > 0 ? String(grpAvgSize) : "—", desc: `${grpGuests} ${t("analytics.totalGuests")}`, info: t("analytics.info.avgGroupSize") },
  ];

  const activeMetrics = activeTab === "total" ? totalMetrics : activeTab === "standard" ? stdMetrics : grpMetrics;

  // ── Reference table rows per tab ─────────────────────────────────────────────
  const refRows = activeTab === "group" ? [
    { name: "Occupancy Rate", formula: "Occupied Room-Nights ÷ Available Room-Nights × 100", value: `${grpOccupancyRate.toFixed(2)}%` },
    { name: "ADR",            formula: "Group Revenue ÷ Occupied Room-Nights",               value: `${cur}${grpADR.toFixed(2)}` },
    { name: "RevPAR",         formula: "Group Revenue ÷ Available Room-Nights",              value: `${cur}${grpRevPAR.toFixed(2)}` },
    { name: "ALOS",           formula: "Occupied Room-Nights ÷ Group Bookings",              value: `${grpALOS.toFixed(2)} nights` },
  ] : activeTab === "standard" ? [
    { name: "Occupancy Rate", formula: "Occupied Rooms ÷ Available Rooms × 100", value: `${stdOccupancyRate.toFixed(2)}%` },
    { name: "ADR",            formula: "Room Revenue ÷ Rooms Sold",               value: `${cur}${stdADR.toFixed(2)}` },
    { name: "RevPAR",         formula: "ADR × Occupancy Rate",                    value: `${cur}${stdRevPAR.toFixed(2)}` },
    { name: "TRevPAR",        formula: "Total Revenue ÷ Available Rooms",         value: `${cur}${stdTRevPAR.toFixed(2)}` },
    { name: "ALOS",           formula: "Occupied Nights ÷ Bookings",              value: `${stdALOS.toFixed(2)} nights` },
  ] : [
    { name: "Occupancy Rate", formula: "(Std + Grp Nights) ÷ Available Room-Nights × 100", value: `${totOccupancyRate.toFixed(2)}%` },
    { name: "ADR",            formula: "Total Room Revenue ÷ Total Occupied Nights",        value: `${cur}${totADR.toFixed(2)}` },
    { name: "RevPAR",         formula: "Total Room Revenue ÷ Available Room-Nights",        value: `${cur}${totRevPAR.toFixed(2)}` },
    { name: "TRevPAR",        formula: "Total Revenue ÷ Available Room-Nights",             value: `${cur}${totTRevPAR.toFixed(2)}` },
    { name: "ALOS",           formula: "Total Occupied Nights ÷ Total Bookings",            value: `${totALOS.toFixed(2)} nights` },
  ];

  const tabs = [
    { key: "total"    as Tab, label: t("owner.totalRevenue") },
    { key: "standard" as Tab, label: t("owner.standardRevenue") },
    { key: "group"    as Tab, label: t("owner.groupBookings") },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Tab switcher */}
      <TabSwitcher tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* KPI cards */}
      <TooltipProvider>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {activeMetrics.map((m) => <MetricCard key={m.label} {...m} />)}
        </div>
      </TooltipProvider>

      {/* Charts row 1: Revenue + Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.revenueByMonth")}</CardTitle>
            <CardDescription>
              {activeTab === "group" ? "Group revenue" : activeTab === "standard" ? "Room revenue only" : "Standard + Group revenue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, name: string) => [
                  `${cur}${v.toLocaleString()}`,
                  name === "stdRevenue" ? t("owner.individual") : t("owner.group"),
                ]} />
                {activeTab === "total" && (
                  <Legend formatter={(v) => v === "stdRevenue" ? t("owner.individual") : t("owner.group")} wrapperStyle={{ fontSize: 11 }} />
                )}
                {activeTab !== "group" && (
                  <Bar dataKey="stdRevenue" stackId="rev" fill={C.standard}
                    radius={activeTab === "standard" ? [4,4,0,0] : [0,0,0,0]} />
                )}
                {activeTab !== "standard" && (
                  <Bar dataKey="grpRevenue" stackId="rev" fill={C.group} radius={[4,4,0,0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.occupancyTrend")}</CardTitle>
            <CardDescription>
              {activeTab === "total" ? "Standard + Group occupancy" : "Based on occupied room nights"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v: number, name: string) => [
                  `${Number(v).toFixed(1)}%`,
                  name === "stdOccupancy" ? t("owner.individual") : t("owner.group"),
                ]} />
                {activeTab === "total" && (
                  <Legend formatter={(v) => v === "stdOccupancy" ? t("owner.individual") : t("owner.group")} wrapperStyle={{ fontSize: 11 }} />
                )}
                {activeTab !== "group" && (
                  <Line type="monotone" dataKey="stdOccupancy" stroke={C.standard} strokeWidth={2} dot={{ r: 4 }} />
                )}
                {activeTab !== "standard" && (
                  <Line type="monotone" dataKey="grpOccupancy" stroke={C.group} strokeWidth={2} dot={{ r: 4 }}
                    strokeDasharray={activeTab === "total" ? "5 3" : undefined} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Channel mix (std/total) or Guests by month (group) + Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeTab !== "group" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("analytics.channelMix")}</CardTitle>
              <CardDescription>{t("analytics.channelMixDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {channelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={channelData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {channelData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("analytics.guestsByMonth")}</CardTitle>
              <CardDescription>{t("analytics.groupGuestsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Guests"]} />
                  <Bar dataKey="grpGuests" fill={C.group} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

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
                <Tooltip formatter={(v: number, name: string) => [
                  v,
                  name === "stdBookings" ? t("owner.individual") : t("owner.group"),
                ]} />
                {activeTab === "total" && (
                  <Legend formatter={(v) => v === "stdBookings" ? t("owner.individual") : t("owner.group")} wrapperStyle={{ fontSize: 11 }} />
                )}
                {activeTab !== "group" && (
                  <Bar dataKey="stdBookings" stackId="b" fill={C.standard}
                    radius={activeTab === "standard" ? [4,4,0,0] : [0,0,0,0]} />
                )}
                {activeTab !== "standard" && (
                  <Bar dataKey="grpBookings" stackId="b" fill={C.group} radius={[4,4,0,0]} />
                )}
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
            {refRows.map(m => (
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
