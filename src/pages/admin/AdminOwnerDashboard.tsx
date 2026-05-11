import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, parseISO } from "date-fns";
import { TrendingUp, BedDouble, DollarSign, Users, CreditCard, CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hotelConfig } from "@/config/hotel";
import { useLanguage } from "@/i18n/LanguageContext";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import {
  useOwnerMonthReservations, useOwnerLast6Reservations, useOwnerRoomUnitsCount,
  useOwnerMonthGroupBookings, useOwnerLast6GroupBookings,
} from "@/hooks/useOwnerDashboardData";

type Tab = "total" | "standard" | "group";

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

export default function AdminOwnerDashboard() {
  const { t } = useLanguage();
  const { data: hotelSettings } = useHotelSettings();
  const [activeTab, setActiveTab] = useState<Tab>("total");
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd   = format(endOfMonth(now),   "yyyy-MM-dd");

  const { data: monthReservations, isLoading } = useOwnerMonthReservations(monthStart, monthEnd);
  const { data: last6Months }                  = useOwnerLast6Reservations();
  const { data: roomUnits }                    = useOwnerRoomUnitsCount();
  const { data: monthGroups }                  = useOwnerMonthGroupBookings(monthStart, monthEnd);
  const { data: last6Groups }                  = useOwnerLast6GroupBookings();

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

  // ── Standard reservation metrics ────────────────────────────────────────────
  const totalRevenue = (monthReservations ?? []).reduce((s, r) =>
    s + Number(r.total_price) + Number(r.tourist_tax_amount ?? 0)
      + Number(r.early_checkin_fee ?? 0) + Number(r.late_checkout_fee ?? 0), 0);

  const totalPrepayment = (monthReservations ?? []).reduce((s, r) =>
    s + (r.deposit_amount ? Number(r.deposit_amount) : 0), 0);

  const daysInMonth = differenceInDays(endOfMonth(now), startOfMonth(now)) + 1;
  const availableRoomNights = totalRooms * daysInMonth;
  const standardOccupiedNights = (monthReservations ?? []).reduce((s, r) => {
    const ci = parseISO(r.check_in_date as string);
    const co = parseISO((r as any).check_out_date as string);
    return s + Math.max(0, differenceInDays(co, ci));
  }, 0);
  const groupOccupiedNights = (monthGroups ?? []).reduce((s, g) => {
    const ci = parseISO(g.check_in_date as string);
    const co = parseISO(g.check_out_date as string);
    const nights = Math.max(0, differenceInDays(co, ci));
    const rooms  = ((g as any).room_unit_ids as string[] | null)?.length ?? 1;
    return s + nights * rooms;
  }, 0);
  const occupiedNights = standardOccupiedNights + groupOccupiedNights;
  const occupancyRate         = availableRoomNights > 0 ? (occupiedNights         / availableRoomNights) * 100 : 0;
  const standardOccupancyRate = availableRoomNights > 0 ? (standardOccupiedNights / availableRoomNights) * 100 : 0;
  const groupOccupancyRate    = availableRoomNights > 0 ? (groupOccupiedNights    / availableRoomNights) * 100 : 0;
  const bookingsCount = monthReservations?.length ?? 0;
  const adr = occupiedNights > 0
    ? (monthReservations ?? []).reduce((s, r) => s + Number(r.total_price), 0) / occupiedNights
    : 0;

  // ── Group booking metrics ────────────────────────────────────────────────────
  const groupRevenue = (monthGroups ?? []).reduce((s, g) => s + Number(g.total_price), 0);
  const groupCount   = (monthGroups ?? []).length;
  const groupGuests  = (monthGroups ?? []).reduce((s, g) => s + Number(g.num_guests), 0);
  const groupPrepayment = (monthGroups ?? []).reduce((s, g) =>
    s + (g.deposit_amount ? Number(g.deposit_amount) : 0), 0);

  // ── Monthly trend data (individual + group) ──────────────────────────────────
  const monthlyData: Record<string, { individual: number; group: number; indBookings: number; grpBookings: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const key = format(subMonths(now, i), "MMM yyyy");
    monthlyData[key] = { individual: 0, group: 0, indBookings: 0, grpBookings: 0 };
  }
  for (const r of last6Months ?? []) {
    const key = format(parseISO(r.check_in_date as string), "MMM yyyy");
    if (monthlyData[key]) {
      monthlyData[key].individual  += Number(r.total_price);
      monthlyData[key].indBookings += 1;
    }
  }
  for (const g of last6Groups ?? []) {
    const key = format(parseISO(g.check_in_date as string), "MMM yyyy");
    if (monthlyData[key]) {
      monthlyData[key].group      += Number(g.total_price);
      monthlyData[key].grpBookings += 1;
    }
  }
  const chartData = Object.entries(monthlyData).map(([month, v]) => ({ month, ...v }));

  const combinedRevenue    = totalRevenue + groupRevenue;
  const combinedPrepayment = totalPrepayment + groupPrepayment;

  const C = {
    individual: "hsl(var(--primary))",
    group: "#6366f1",
  };

  const KpiCard = ({
    icon: Icon, label, value, sub, color, bg,
  }: { icon: any; label: string; value: string; sub: string; color: string; bg: string }) => (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "total",    label: t("owner.totalRevenue") },
    { key: "standard", label: t("owner.standardRevenue") },
    { key: "group",    label: t("owner.groupBookings") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("admin.ownerDashboard")}</h1>
        <p className="text-muted-foreground">{format(now, "MMMM yyyy")}</p>
      </div>

      {/* ── Tab switcher ─────────────────────────────────────────────────────── */}
      <TabSwitcher tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      {activeTab === "total" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={DollarSign}
            label={t("owner.totalRevenue")}
            value={`${hotelConfig.currencySymbol}${Math.round(combinedRevenue).toLocaleString()}`}
            sub={t("owner.thisMonth")}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <KpiCard
            icon={CreditCard}
            label={t("owner.prepayment")}
            value={combinedPrepayment > 0 ? `${hotelConfig.currencySymbol}${Math.round(combinedPrepayment).toLocaleString()}` : "—"}
            sub={t("owner.thisMonth")}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <KpiCard
            icon={TrendingUp}
            label={t("owner.occupancy")}
            value={`${occupancyRate.toFixed(1)}%`}
            sub={`${occupiedNights} ${t("owner.nightsUnit")}`}
            color="text-primary"
            bg="bg-primary/10"
          />
          <KpiCard
            icon={BedDouble}
            label="ADR"
            value={`${hotelConfig.currencySymbol}${Math.round(adr).toLocaleString()}`}
            sub={t("owner.avgDailyRate")}
            color="text-amber-600"
            bg="bg-amber-50"
          />
        </div>
      )}

      {activeTab === "standard" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={DollarSign}
            label={t("owner.totalRevenue")}
            value={`${hotelConfig.currencySymbol}${Math.round(totalRevenue).toLocaleString()}`}
            sub={t("owner.thisMonth")}
            color="text-green-600"
            bg="bg-green-50"
          />
          <KpiCard
            icon={CreditCard}
            label={t("owner.prepayment")}
            value={totalPrepayment > 0 ? `${hotelConfig.currencySymbol}${Math.round(totalPrepayment).toLocaleString()}` : "—"}
            sub={t("owner.thisMonth")}
            color="text-sky-600"
            bg="bg-sky-50"
          />
          <KpiCard
            icon={TrendingUp}
            label={t("owner.occupancy")}
            value={`${standardOccupancyRate.toFixed(1)}%`}
            sub={`${standardOccupiedNights} ${t("owner.nightsUnit")}`}
            color="text-primary"
            bg="bg-primary/10"
          />
          <KpiCard
            icon={CalendarCheck}
            label={t("owner.bookingsCount")}
            value={String(bookingsCount)}
            sub={t("owner.thisMonth")}
            color="text-purple-600"
            bg="bg-purple-50"
          />
        </div>
      )}

      {activeTab === "group" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={DollarSign}
            label={t("owner.totalRevenue")}
            value={`${hotelConfig.currencySymbol}${Math.round(groupRevenue).toLocaleString()}`}
            sub={t("owner.thisMonth")}
            color="text-indigo-600"
            bg="bg-indigo-50"
          />
          <KpiCard
            icon={CreditCard}
            label={t("owner.prepayment")}
            value={groupPrepayment > 0 ? `${hotelConfig.currencySymbol}${Math.round(groupPrepayment).toLocaleString()}` : "—"}
            sub={t("owner.thisMonth")}
            color="text-violet-600"
            bg="bg-violet-50"
          />
          <KpiCard
            icon={TrendingUp}
            label={t("owner.occupancy")}
            value={`${groupOccupancyRate.toFixed(1)}%`}
            sub={`${groupOccupiedNights} ${t("owner.nightsUnit")}`}
            color="text-indigo-600"
            bg="bg-indigo-50"
          />
          <KpiCard
            icon={Users}
            label={t("owner.groupBookings")}
            value={String(groupCount)}
            sub={`${groupGuests} ${t("owner.groupGuests")}`}
            color="text-teal-600"
            bg="bg-teal-50"
          />
        </div>
      )}

      {/* Revenue + Bookings trend charts */}
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
                <Tooltip
                  formatter={(v: number, name: string) => [
                    `${hotelConfig.currencySymbol}${v.toLocaleString()}`,
                    name === "individual" ? t("owner.individual") : t("owner.group"),
                  ]}
                />
                <Legend
                  formatter={(v) => v === "individual" ? t("owner.individual") : t("owner.group")}
                  wrapperStyle={{ fontSize: 11 }}
                />
                {activeTab !== "group" && (
                  <Bar dataKey="individual" stackId="rev" fill={C.individual}
                    radius={activeTab === "standard" ? [4,4,0,0] : [0,0,0,0]} />
                )}
                {activeTab !== "standard" && (
                  <Bar dataKey="group" stackId="rev" fill={C.group} radius={[4,4,0,0]} />
                )}
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
                <Tooltip
                  formatter={(v: number, name: string) => [
                    v,
                    name === "indBookings" ? t("owner.individual") : t("owner.group"),
                  ]}
                />
                <Legend
                  formatter={(v) => v === "indBookings" ? t("owner.individual") : t("owner.group")}
                  wrapperStyle={{ fontSize: 11 }}
                />
                {activeTab !== "group" && (
                  <Line type="monotone" dataKey="indBookings" stroke={C.individual} strokeWidth={2} dot={{ r: 4 }} />
                )}
                {activeTab !== "standard" && (
                  <Line type="monotone" dataKey="grpBookings" stroke={C.group} strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 3" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy progress */}
      {capacity > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("owner.salesProgress")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(activeTab === "total" ? [
              { label: t("owner.occupancy"),  rate: occupancyRate,         nights: occupiedNights,         color: "bg-primary",    textColor: "text-primary" },
              { label: t("owner.individual"), rate: standardOccupancyRate, nights: standardOccupiedNights, color: "bg-green-500",  textColor: "text-green-600" },
              { label: t("owner.group"),      rate: groupOccupancyRate,    nights: groupOccupiedNights,    color: "bg-indigo-500", textColor: "text-indigo-600" },
            ] : activeTab === "standard" ? [
              { label: t("owner.individual"), rate: standardOccupancyRate, nights: standardOccupiedNights, color: "bg-green-500",  textColor: "text-green-600" },
            ] : [
              { label: t("owner.group"),      rate: groupOccupancyRate,    nights: groupOccupiedNights,    color: "bg-indigo-500", textColor: "text-indigo-600" },
            ]).map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={`font-semibold ${row.textColor}`}>{row.rate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.color} transition-all`}
                    style={{ width: `${Math.min(100, row.rate)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.nights} {t("owner.nightsUnit")} {t("owner.of")} {availableRoomNights} {t("owner.available")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
