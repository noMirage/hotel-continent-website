import { useState, useRef } from "react";
import {
  format, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  parseISO, isWithinInterval, startOfDay, endOfDay,
  getDaysInMonth, eachDayOfInterval, isBefore, isAfter,
} from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { Search, Filter, Download, Plus, BarChart2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Check, X, LogIn } from "lucide-react";
import { Button as Btn } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { hotelConfig } from "@/config/hotel";
import { statusBadgeClass } from "@/lib/booking-status";
import type { Reservation, BookingStatus } from "@/lib/supabase-types";
import { CalendarGroupDialog } from "@/components/admin/CalendarGroupDialog";
import { CalendarBookingDialog } from "@/components/admin/CalendarBookingDialog";
import { GuestFormDialog } from "@/components/admin/GuestFormDialog";
import { ViewGuestFormDialog } from "@/components/admin/ViewGuestFormDialog";
import { CheckInPaymentDialog } from "@/components/admin/CheckInPaymentDialog";
import { DeleteCheckinDialog } from "@/components/admin/DeleteCheckinDialog";
import { GroupBookingCard } from "@/components/admin/GroupBookingCard";
import { SingleBookingRow } from "@/components/admin/SingleBookingRow";
import { useAdminProfilesLookup, useRoomUnitsForOccupancy, useGroupBookingsForOccupancy, useAdminBookingsList } from "@/hooks/useBookingsData";
import { useBookingMutations } from "@/hooks/useBookingMutations";
import { downloadCSV } from "@/lib/export-csv";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIsSuperAdmin, useIsViewer } from "@/hooks/useUserRole";

function statusLabel(status: BookingStatus, t: (k: string) => string): string {
  switch (status) {
    case "UNPROCESSED": return t("bookings.unprocessed");
    case "CHECK_IN":  return t("bookings.checkInStatus");
    case "CHECK_OUT": return t("bookings.checkOutStatus");
    case "PENDING":   return t("bookings.pending");
    case "CONFIRMED": return t("bookings.confirmed");
    case "DECLINED":  return t("bookings.declined");
    case "CANCELLED": return t("bookings.cancelled");
    default:          return status;
  }
}

export default function AdminBookings() {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { isSuperAdmin } = useIsSuperAdmin();
  const { isViewer } = useIsViewer();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]   = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter]     = useState<"all" | "new" | "confirmed">("all");
  const [dateFilter, setDateFilter]     = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo]     = useState<Date | undefined>();
  const [visibleCount, setVisibleCount]     = useState(10);

  // ── Dialog / selection state ────────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking]     = useState<Reservation | null>(null);
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
  const [deleteCheckinBooking, setDeleteCheckinBooking] = useState<Reservation | null>(null);
  const [expandedGroups, setExpandedGroups]           = useState<Set<string>>(new Set());
  const [groupDetailGroupId, setGroupDetailGroupId]   = useState<string | null>(null);

  // ── Occupancy export state ──────────────────────────────────────────────────
  const [occupancyDialogOpen, setOccupancyDialogOpen] = useState(false);
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [occYear, setOccYear]   = useState(currentYear);
  const [occMonth, setOccMonth] = useState(currentMonth);

  // ── Check-in flow state ─────────────────────────────────────────────────────
  const [checkinPaymentReservation, setCheckinPaymentReservation] = useState<Reservation | null>(null);
  const [pendingCheckinQueue, setPendingCheckinQueue]             = useState<Reservation[]>([]);
  const [checkinQueue, setCheckinQueue]         = useState<Reservation[]>([]);
  const [checkinQueueIdx, setCheckinQueueIdx]   = useState(0);
  const currentCheckin = checkinQueue.length > 0 ? (checkinQueue[checkinQueueIdx] ?? null) : null;
  const checkinAdvancingRef = useRef(false);
  const [viewFormBooking, setViewFormBooking]   = useState<Reservation | null>(null);

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { data: adminProfiles }            = useAdminProfilesLookup();
  const { data: allRoomUnits }             = useRoomUnitsForOccupancy();
  const { data: groupBookingsForOccupancy } = useGroupBookingsForOccupancy();
  const { data: bookings, isLoading }      = useAdminBookingsList();

  const roomNumberMap = new Map<string, string>(
    (allRoomUnits ?? []).map(u => [u.id, u.room_number])
  );

  // Derive live from bookings — re-computes whenever bookings refetches
  const groupDetailBookings = groupDetailGroupId && bookings
    ? bookings.filter(b => b.booking_group_id === groupDetailGroupId)
    : null;

  // ── Mutation hook ───────────────────────────────────────────────────────────
  const {
    updateStatusMutation,
    deleteCheckinMutation,
    bulkUpdateStatusMutation,
    groupConfirmMutation,
  } = useBookingMutations({
    onStatusUpdated: () => setSelectedBooking(null),
    onDeleted: () => setDeleteCheckinBooking(null),
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const handleStatusChange = (id: string, status: BookingStatus, currentStatus?: BookingStatus) => {
    updateStatusMutation.mutate({ id, status, currentStatus });
  };

  function openCheckinPayment(booking: Reservation) {
    setSelectedBooking(null);
    setCheckinPaymentReservation(booking);
  }

  // ── Filtered bookings ───────────────────────────────────────────────────────
  const filteredBookings = bookings?.filter((booking) => {
    if (booking.status === "CANCELLED") return false;
    if (booking.type === "banquet") return false;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      booking.guest_name.toLowerCase().includes(q) ||
      (booking.guest_email ?? "").toLowerCase().includes(q) ||
      (booking.guest_phone ?? "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesSource =
      sourceFilter === "all" ||
      (sourceFilter === "manual" && booking.booking_source === "ADMIN") ||
      (sourceFilter === "web"    && booking.booking_source === "SITE") ||
      (sourceFilter === "ai"     && booking.booking_source === "AI");

    let matchesDate = true;
    const checkIn = parseISO(booking.check_in_date);
    const now = new Date();
    if (dateFilter === "today") {
      matchesDate = isToday(checkIn);
    } else if (dateFilter === "week") {
      matchesDate = isWithinInterval(checkIn, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
    } else if (dateFilter === "month") {
      matchesDate = isWithinInterval(checkIn, { start: startOfMonth(now), end: endOfMonth(now) });
    } else if (dateFilter === "custom" && customDateFrom && customDateTo) {
      matchesDate = isWithinInterval(checkIn, { start: startOfDay(customDateFrom), end: endOfDay(customDateTo) });
    }

    const matchesType =
      typeFilter === "all"       ? true :
      typeFilter === "new"       ? booking.status === "UNPROCESSED" :
      typeFilter === "confirmed" ? booking.status === "CONFIRMED" :
      true;

    return matchesSearch && matchesStatus && matchesSource && matchesDate && matchesType;
  });

  // ── Display items (single vs grouped) ───────────────────────────────────────
  type DisplayItem =
    | { type: "single"; booking: Reservation }
    | { type: "group"; groupId: string; bookings: Reservation[] };

  const displayItems: DisplayItem[] = (() => {
    if (!filteredBookings) return [];
    const groups = new Map<string, Reservation[]>();
    for (const b of filteredBookings) {
      if (b.booking_group_id) {
        const arr = groups.get(b.booking_group_id) ?? [];
        arr.push(b);
        groups.set(b.booking_group_id, arr);
      }
    }
    const result: DisplayItem[] = [];
    const seen = new Set<string>();
    for (const b of filteredBookings) {
      if (!b.booking_group_id) {
        result.push({ type: "single", booking: b });
      } else if (!seen.has(b.booking_group_id)) {
        seen.add(b.booking_group_id);
        result.push({ type: "group", groupId: b.booking_group_id, bookings: groups.get(b.booking_group_id)! });
      }
    }
    return result;
  })();

  // ── Export helpers ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!filteredBookings || filteredBookings.length === 0) return;
    const rows = filteredBookings.map((b) => ({
      guest_name: b.guest_name,
      guest_email: b.guest_email,
      guest_phone: b.guest_phone || "",
      check_in: b.check_in_date,
      check_out: b.check_out_date,
      guests: b.num_guests,
      total_price: b.total_price,
      status: b.status,
      booking_source: b.booking_source || "SITE",
      created_at: format(new Date(b.created_at), "yyyy-MM-dd HH:mm"),
    }));
    downloadCSV(rows, `bookings-${format(new Date(), "yyyy-MM-dd")}`);
  };

  function handleExportOccupancy() {
    if (!allRoomUnits || !bookings) return;
    const numRooms  = allRoomUnits.length;
    const daysInMon = getDaysInMonth(new Date(occYear, occMonth - 1));
    const totalRoomNights = numRooms * daysInMon;
    const firstDay = new Date(occYear, occMonth - 1, 1);
    const lastDay  = new Date(occYear, occMonth - 1, daysInMon);
    const allDays  = eachDayOfInterval({ start: firstDay, end: lastDay });
    const activeStatuses = ["UNPROCESSED", "PENDING", "CONFIRMED", "CHECK_IN", "CHECK_OUT"];
    const activeBookings = bookings.filter(b => activeStatuses.includes(b.status));
    const activeGroupBookings = (groupBookingsForOccupancy ?? []).filter(g => activeStatuses.includes(g.status));
    let occupiedRoomNights = 0;
    for (const day of allDays) {
      for (const room of allRoomUnits) {
        const byRegular = activeBookings.some(b => {
          if (b.room_unit_id !== room.id) return false;
          const ci = parseISO(b.check_in_date), co = parseISO(b.check_out_date);
          return !isAfter(ci, day) && isBefore(day, co);
        });
        const byGroup = activeGroupBookings.some(g => {
          if (!g.room_unit_ids.includes(room.id)) return false;
          const ci = parseISO(g.check_in_date), co = parseISO(g.check_out_date);
          return !isAfter(ci, day) && isBefore(day, co);
        });
        if (byRegular || byGroup) occupiedRoomNights++;
      }
    }
    const unoccupied  = totalRoomNights - occupiedRoomNights;
    const occupancyPct = totalRoomNights > 0
      ? ((occupiedRoomNights / totalRoomNights) * 100).toFixed(2) : "0.00";
    const monthLabel = format(new Date(occYear, occMonth - 1), "MMMM yyyy", { locale: dateLocale });
    const rows = [
      ["Metric", "Value"],
      [t("bookings.totalRoomNights"),    `${numRooms} × ${daysInMon} = ${totalRoomNights}`],
      [t("bookings.occupiedNights"),     String(occupiedRoomNights)],
      [t("bookings.unoccupiedNights"),   String(unoccupied)],
      [t("bookings.occupancyPct"),       `${occupancyPct}%`],
      [t("bookings.occupancyIncludesGroup"), "✓"],
    ];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `occupancy-${occYear}-${String(occMonth).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOccupancyDialogOpen(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("bookings.title")}</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("bookings.title")}</h1>
          <p className="text-muted-foreground">{t("bookings.subtitle")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isViewer && (
            <>
              <Button variant="outline" onClick={handleExportCSV} disabled={!filteredBookings?.length}>
                <Download className="h-4 w-4 mr-2" />
                {t("bookings.exportCSV")}
              </Button>
              <Button onClick={() => setIsManualBookingOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("bookings.manualBooking")}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setOccupancyDialogOpen(true)}>
            <BarChart2 className="h-4 w-4 mr-2" />
            {t("bookings.occupancyExport")}
          </Button>
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(["all", "new", "confirmed"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setTypeFilter(tab); setVisibleCount(10); }}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              typeFilter === tab
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {t(`banquet.filter.${tab}`)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("bookings.searchGuests")}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(10); }}
            className="pl-10 w-full sm:w-64"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setVisibleCount(10); }}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("bookings.allStatus")}</SelectItem>
            <SelectItem value="UNPROCESSED">{t("bookings.unprocessed")}</SelectItem>
            <SelectItem value="PENDING">{t("bookings.pending")}</SelectItem>
            <SelectItem value="CONFIRMED">{t("bookings.confirmed")}</SelectItem>
            <SelectItem value="CHECK_IN">{t("bookings.checkInStatus")}</SelectItem>
            <SelectItem value="CHECK_OUT">{t("bookings.checkOutStatus")}</SelectItem>
            <SelectItem value="DECLINED">{t("bookings.declined")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setVisibleCount(10); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t("bookings.allSources")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("bookings.allSources")}</SelectItem>
            <SelectItem value="manual">{t("bookings.sourceManual")}</SelectItem>
            <SelectItem value="web">{t("bookings.sourceWeb")}</SelectItem>
            <SelectItem value="ai">{t("bookings.sourceAI")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v as typeof dateFilter); setVisibleCount(10); }}>
          <SelectTrigger className="w-full sm:w-44">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("bookings.allDates")}</SelectItem>
            <SelectItem value="today">{t("bookings.today")}</SelectItem>
            <SelectItem value="week">{t("bookings.thisWeek")}</SelectItem>
            <SelectItem value="month">{t("bookings.thisMonth")}</SelectItem>
            <SelectItem value="custom">{t("bookings.customRange")}</SelectItem>
          </SelectContent>
        </Select>
        {dateFilter === "custom" && (
          <div className="flex gap-2 items-center flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-sm">
                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                  {customDateFrom ? format(customDateFrom, "dd.MM.yyyy") : t("calendar.from")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarPicker mode="single" selected={customDateFrom} onSelect={(d) => { setCustomDateFrom(d); setVisibleCount(10); }} locale={dateLocale} />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-sm">
                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                  {customDateTo ? format(customDateTo, "dd.MM.yyyy") : t("calendar.to")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarPicker mode="single" selected={customDateTo} onSelect={(d) => { setCustomDateTo(d); setVisibleCount(10); }} disabled={(d) => !customDateFrom || d < customDateFrom} locale={dateLocale} />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Booking cards */}
      <div className="space-y-4">
        {displayItems.length > 0 ? (
          displayItems.slice(0, visibleCount).map((item) => {
            if (item.type === "single") {
              const booking = item.booking;
              return (
                <Card key={booking.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <SingleBookingRow
                      booking={booking}
                      adminProfiles={adminProfiles}
                      dateLocale={dateLocale}
                      t={t}
                      isViewer={isViewer}
                      isSuperAdmin={isSuperAdmin}
                      updateStatusMutation={updateStatusMutation}
                      onView={() => setSelectedBooking(booking)}
                      onViewForm={() => setViewFormBooking(booking)}
                      onCheckin={() => openCheckinPayment(booking)}
                      onDeleteCheckin={() => setDeleteCheckinBooking(booking)}
                      onStatusChange={handleStatusChange}
                      onConfirm={() => setSelectedBooking(booking)}
                    />
                  </CardContent>
                </Card>
              );
            }

            const { groupId, bookings: grpBookings } = item;
            return (
              <GroupBookingCard
                key={groupId}
                groupId={groupId}
                bookings={grpBookings}
                isExpanded={expandedGroups.has(groupId)}
                onToggleExpand={() => setExpandedGroups(prev => {
                  const next = new Set(prev);
                  if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
                  return next;
                })}
                adminProfiles={adminProfiles}
                roomNumberMap={roomNumberMap}
                dateLocale={dateLocale}
                t={t}
                isViewer={isViewer}
                isSuperAdmin={isSuperAdmin}
                updateStatusMutation={updateStatusMutation}
                bulkUpdateStatusMutation={bulkUpdateStatusMutation}
                groupConfirmMutation={groupConfirmMutation}
                onViewDetail={() => setGroupDetailGroupId(groupId)}
                onCheckinPayment={openCheckinPayment}
                onCheckinAll={(bookings) => {
                  setPendingCheckinQueue(bookings);
                  setCheckinPaymentReservation(bookings[0]);
                }}
                onDeleteCheckin={setDeleteCheckinBooking}
                onViewForm={setViewFormBooking}
                onViewBooking={setSelectedBooking}
              />
            );
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">{t("bookings.noBookings")}</p>
            </CardContent>
          </Card>
        )}
        {displayItems.length > visibleCount && (
          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground mb-2">
              {t("bookings.showing", { count: String(Math.min(visibleCount, displayItems.length)), total: String(displayItems.length) })}
            </p>
            <Button variant="outline" onClick={() => setVisibleCount(c => c + 10)}>
              {t("bookings.showMore")}
            </Button>
          </div>
        )}
      </div>

      {/* ── Detail dialog ──────────────────────────────────────────────────── */}
      <CalendarBookingDialog
        reservation={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onOpenCheckin={openCheckinPayment}
      />

      {/* ── Delete CHECK_IN confirmation ───────────────────────────────────── */}
      <DeleteCheckinDialog
        booking={deleteCheckinBooking}
        isPending={deleteCheckinMutation.isPending}
        onDelete={(id) => deleteCheckinMutation.mutate(id)}
        onClose={() => setDeleteCheckinBooking(null)}
      />

      {/* ── Group detail popup ─────────────────────────────────────────────── */}
      <Dialog open={!!groupDetailGroupId} onOpenChange={() => setGroupDetailGroupId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("bookings.details")}</DialogTitle>
            <DialogDescription>{t("bookings.groupBooking")}</DialogDescription>
          </DialogHeader>
          {groupDetailBookings && groupDetailBookings.length > 0 && (() => {
            const first = groupDetailBookings[0];
            const totalPrice  = groupDetailBookings.reduce((s, b) => s + Number(b.total_price), 0);
            const totalGuests = groupDetailBookings.reduce((s, b) => s + b.num_guests, 0);
            const totalTax    = groupDetailBookings.reduce((s, b) => s + Number(b.tourist_tax_amount), 0);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <Label className="text-muted-foreground">{t("bookings.contactPerson")}</Label>
                    <p className="font-medium break-words">{first.guest_name}</p>
                  </div>
                  <div className="min-w-0">
                    <Label className="text-muted-foreground">{t("bookings.email")}</Label>
                    <p className="font-medium break-all">{first.guest_email || t("common.na")}</p>
                  </div>
                  <div className="min-w-0">
                    <Label className="text-muted-foreground">{t("bookings.phone")}</Label>
                    <p className="font-medium">{first.guest_phone || t("common.na")}</p>
                  </div>
                  <div className="min-w-0">
                    <Label className="text-muted-foreground">{t("bookings.guests")}</Label>
                    <p className="font-medium">{totalGuests}</p>
                  </div>
                  <div className="min-w-0">
                    <Label className="text-muted-foreground">{t("bookings.checkIn")}</Label>
                    <p className="font-medium">{format(new Date(first.check_in_date), "dd MMM yyyy", { locale: dateLocale })}</p>
                  </div>
                  <div className="min-w-0">
                    <Label className="text-muted-foreground">{t("bookings.checkOut")}</Label>
                    <p className="font-medium">{format(new Date(first.check_out_date), "dd MMM yyyy", { locale: dateLocale })}</p>
                  </div>
                  <div className="min-w-0">
                    <Label className="text-muted-foreground">{t("bookings.accommodation")}</Label>
                    <p className="font-bold">{hotelConfig.currencySymbol}{totalPrice.toLocaleString()}</p>
                  </div>
                  {totalTax > 0 && (
                    <>
                      <div className="min-w-0">
                        <Label className="text-muted-foreground">{t("bookings.touristTax")}</Label>
                        <p className="font-medium">{hotelConfig.currencySymbol}{totalTax.toFixed(2)}</p>
                      </div>
                      <div className="min-w-0 col-span-2">
                        <Label className="text-muted-foreground">{t("bookings.grandTotal")}</Label>
                        <p className="font-bold">{hotelConfig.currencySymbol}{(totalPrice + totalTax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">{t("bookings.rooms")}</Label>
                  <div className="border rounded-md divide-y text-sm">
                    {groupDetailBookings.map(b => {
                      const rn = roomNumberMap.get(b.room_unit_id) ?? "—";
                      return (
                        <div key={b.id} className="flex items-center justify-between px-3 py-2 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">#{rn}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(b.status)}`}>
                              {statusLabel(b.status, t)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {b.num_guests} {t("bookings.guest")}{b.num_guests > 1 ? "s" : ""}
                            </span>
                          </div>
                          {!isViewer && (
                            <div className="flex gap-1">
                              {b.status === "UNPROCESSED" && (
                                <>
                                  <Btn size="sm" className="h-7 text-xs px-2"
                                    onClick={() => updateStatusMutation.mutate({ id: b.id, status: "PENDING", currentStatus: "UNPROCESSED" })}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <Check className="h-3 w-3 mr-1" />{t("bookings.accept")}
                                  </Btn>
                                  <Btn size="sm" variant="destructive" className="h-7 text-xs px-2"
                                    onClick={() => updateStatusMutation.mutate({ id: b.id, status: "DECLINED", currentStatus: "UNPROCESSED" })}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <X className="h-3 w-3 mr-1" />{t("bookings.decline")}
                                  </Btn>
                                </>
                              )}
                              {b.status === "PENDING" && (
                                <>
                                  <Btn size="sm" className="h-7 text-xs px-2"
                                    onClick={() => updateStatusMutation.mutate({ id: b.id, status: "CONFIRMED" })}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <Check className="h-3 w-3 mr-1" />{t("bookings.confirm")}
                                  </Btn>
                                  <Btn size="sm" variant="destructive" className="h-7 text-xs px-2"
                                    onClick={() => updateStatusMutation.mutate({ id: b.id, status: "DECLINED" })}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <X className="h-3 w-3 mr-1" />{t("bookings.decline")}
                                  </Btn>
                                </>
                              )}
                              {b.status === "CONFIRMED" && (
                                <Btn size="sm" className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => { setGroupDetailGroupId(null); openCheckinPayment(b); }}
                                >
                                  <LogIn className="h-3 w-3 mr-1" />{t("bookings.checkInAction")}
                                </Btn>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {first.special_requests && (
                  <div>
                    <Label className="text-muted-foreground">{t("bookings.specialRequests")}</Label>
                    <p className="font-medium bg-muted p-3 rounded-lg mt-1">{first.special_requests}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Manual booking ─────────────────────────────────────────────────── */}
      <CalendarGroupDialog open={isManualBookingOpen} onOpenChange={setIsManualBookingOpen} selectedRoomUnits={[]} hideGroupTab />

      {/* ── Check-in payment dialog ────────────────────────────────────────── */}
      {checkinPaymentReservation && (
        <CheckInPaymentDialog
          open={!!checkinPaymentReservation}
          onOpenChange={open => {
            if (!open) {
              setCheckinPaymentReservation(null);
              setPendingCheckinQueue([]);
            }
          }}
          reservation={checkinPaymentReservation}
          groupReservations={pendingCheckinQueue.length > 1 ? pendingCheckinQueue : undefined}
          onConfirm={() => {
            const res = checkinPaymentReservation!;
            setCheckinPaymentReservation(null);
            const queue = pendingCheckinQueue.length > 0 ? pendingCheckinQueue : [res];
            setPendingCheckinQueue([]);
            setCheckinQueue(queue);
            setCheckinQueueIdx(0);
          }}
        />
      )}

      {/* ── Guest check-in form ────────────────────────────────────────────── */}
      {currentCheckin && (
        <GuestFormDialog
          open={!!currentCheckin}
          onOpenChange={(open) => {
            if (!open) {
              if (checkinAdvancingRef.current) {
                checkinAdvancingRef.current = false;
              } else {
                setCheckinQueue([]);
                setCheckinQueueIdx(0);
              }
            }
          }}
          reservation={currentCheckin}
          onSuccess={() => {
            if (checkinQueueIdx < checkinQueue.length - 1) {
              checkinAdvancingRef.current = true;
              setCheckinQueueIdx(i => i + 1);
            }
          }}
          roomInfo={checkinQueue.length > 1 ? {
            index: checkinQueueIdx + 1,
            total: checkinQueue.length,
            label: roomNumberMap.get(currentCheckin.room_unit_id),
          } : undefined}
        />
      )}

      {/* ── View / export check-in form ────────────────────────────────────── */}
      {viewFormBooking && (
        <ViewGuestFormDialog
          open={!!viewFormBooking}
          onOpenChange={(open) => { if (!open) setViewFormBooking(null); }}
          reservation={viewFormBooking}
        />
      )}

      {/* ── Monthly occupancy export dialog ───────────────────────────────── */}
      <Dialog open={occupancyDialogOpen} onOpenChange={setOccupancyDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("bookings.occupancyExport")}</DialogTitle>
            <DialogDescription>{t("bookings.selectMonth")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">{language === "uk" ? "Рік" : "Year"}</Label>
                <Select value={String(occYear)} onValueChange={v => setOccYear(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">{language === "uk" ? "Місяць" : "Month"}</Label>
                <Select value={String(occMonth)} onValueChange={v => setOccMonth(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <SelectItem key={m} value={String(m)}>
                        {format(new Date(2000, m - 1), "MMMM", { locale: dateLocale })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {allRoomUnits && (
              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                {(() => {
                  const numRooms  = allRoomUnits.length;
                  const daysInMon = getDaysInMonth(new Date(occYear, occMonth - 1));
                  const totalRN   = numRooms * daysInMon;
                  const firstDay  = new Date(occYear, occMonth - 1, 1);
                  const lastDay   = new Date(occYear, occMonth - 1, daysInMon);
                  const allDays   = eachDayOfInterval({ start: firstDay, end: lastDay });
                  const ab = (bookings ?? []).filter(b =>
                    ["UNPROCESSED", "PENDING", "CONFIRMED", "CHECK_IN", "CHECK_OUT"].includes(b.status)
                  );
                  let occ = 0;
                  for (const day of allDays) {
                    for (const room of allRoomUnits) {
                      if (ab.some(b => {
                        if (b.room_unit_id !== room.id) return false;
                        const ci = parseISO(b.check_in_date), co = parseISO(b.check_out_date);
                        return !isAfter(ci, day) && isBefore(day, co);
                      })) occ++;
                    }
                  }
                  const pct = totalRN > 0 ? ((occ / totalRN) * 100).toFixed(1) : "0.0";
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("bookings.totalRoomNights")}</span>
                        <span className="font-medium">{numRooms} × {daysInMon} = {totalRN}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("bookings.occupiedNights")}</span>
                        <span className="font-medium">{occ}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("bookings.unoccupiedNights")}</span>
                        <span className="font-medium">{totalRN - occ}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-semibold">
                        <span>{t("bookings.occupancyPct")}</span>
                        <span>{pct}%</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOccupancyDialogOpen(false)}>{t("guestForm.cancel")}</Button>
            <Button onClick={handleExportOccupancy}>
              <Download className="h-4 w-4 mr-2" />
              {t("bookings.exportOccupancy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
