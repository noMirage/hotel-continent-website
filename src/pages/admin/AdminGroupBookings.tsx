import { useState } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import {
  Plus, Trash2, Loader2, CalendarIcon, X, Users,
  Check, LogIn, LogOut, Search, Pencil, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { hotelConfig } from "@/config/hotel";
import { cn } from "@/lib/utils";
import type { GroupBookingRequest, GroupCalculation } from "@/lib/supabase-types";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIsViewer } from "@/hooks/useUserRole";
import { statusBadgeClass } from "@/lib/booking-status";
import { CalendarGroupDialog } from "@/components/admin/CalendarGroupDialog";
import { GroupBookingDetailsDialog } from "@/components/admin/GroupBookingDetailsDialog";
import { GroupBookingRequestCard } from "@/components/admin/GroupBookingRequestCard";
import { CalculationDialog } from "@/components/admin/CalculationDialog";
import { useGroupBookingsList, useGroupBookingRequestsList, useGroupCalculationsList } from "@/hooks/useGroupBookingsPageData";
import { useAdminProfilesLookup } from "@/hooks/useBookingsData";
import { useGroupBookingsMutations } from "@/hooks/useGroupBookingsMutations";

function statusLabel(s: string, t: (k: string) => string): string {
  switch (s) {
    case "UNPROCESSED": return t("bookings.unprocessed");
    case "PENDING":     return t("bookings.pending");
    case "CONFIRMED":   return t("bookings.confirmed");
    case "CHECK_IN":    return t("bookings.checkInStatus");
    case "CHECK_OUT":   return t("bookings.checkOutStatus");
    case "DECLINED":    return t("bookings.declined");
    case "CANCELLED":   return t("bookings.cancelled");
    default:            return s;
  }
}

export default function AdminGroupBookings() {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { isViewer } = useIsViewer();
  const lang = language as "en" | "uk";

  // ── Dialog state ─────────────────────────────────────────────────────────────
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [selectedDetailBookingId, setSelectedDetailBookingId] = useState<string | null>(null);
  const [selectedDetailTab, setSelectedDetailTab] = useState<"view" | "edit" | "guests">("view");
  const [deleteBookingId, setDeleteBookingId] = useState<string | null>(null);

  const [isCalcDialogOpen, setIsCalcDialogOpen] = useState(false);
  const [editingCalc, setEditingCalc] = useState<GroupCalculation | null>(null);
  const [deleteCalcId, setDeleteCalcId] = useState<string | null>(null);

  const [convertingRequest, setConvertingRequest] = useState<GroupBookingRequest | null>(null);

  // ── Filter/search state ───────────────────────────────────────────────────────
  const [searchQuery,  setSearchQuery]  = useState("");
  const [sortBy,       setSortBy]       = useState("newest");
  const [filterFrom,   setFilterFrom]   = useState<Date | undefined>();
  const [filterTo,     setFilterTo]     = useState<Date | undefined>();
  const [filterStatus, setFilterStatus] = useState("all");
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data: groupBookings,  isLoading: bookingsLoading  } = useGroupBookingsList();
  const { data: groupRequests,  isLoading: requestsLoading  } = useGroupBookingRequestsList();
  const { data: calculations,   isLoading: calcsLoading     } = useGroupCalculationsList();
  const { data: adminProfiles } = useAdminProfilesLookup();

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const { deleteBookingMutation, deleteCalcMutation, statusMutation, updateRequestMutation } =
    useGroupBookingsMutations({
      onDeleteBookingSuccess: () => setDeleteBookingId(null),
      onDeleteCalcSuccess:    () => setDeleteCalcId(null),
      onRequestUpdated:       () => setSavingRequestId(null),
    });

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSaveRequest = (id: string, status: GroupBookingRequest["status"], notes: string) => {
    setSavingRequestId(id);
    updateRequestMutation.mutate({ id, status, admin_notes: notes });
  };

  const handleRequestConverted = () => {
    if (!convertingRequest) return;
    updateRequestMutation.mutate({
      id:          convertingRequest.id,
      status:      "resolved",
      admin_notes: convertingRequest.admin_notes ?? "",
    });
    setConvertingRequest(null);
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedDetailBooking = selectedDetailBookingId
    ? (groupBookings ?? []).find(b => b.id === selectedDetailBookingId) ?? null
    : null;

  const newRequestsCount = (groupRequests ?? []).filter(r => r.status === "new").length;

  const hasFilters = searchQuery || filterStatus !== "all" || filterFrom || filterTo;

  const filteredBookings = (groupBookings ?? [])
    .filter(b => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !b.booking_name.toLowerCase().includes(q) &&
          !b.contact_person.toLowerCase().includes(q) &&
          !(b.phone ?? "").toLowerCase().includes(q)
        ) return false;
      }
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      if (filterFrom && parseISO(b.check_in_date) < filterFrom) return false;
      if (filterTo && parseISO(b.check_in_date) > filterTo) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "checkIn") return a.check_in_date.localeCompare(b.check_in_date);
      if (sortBy === "status") {
        const ORDER: Record<string, number> = { PENDING: 0, CONFIRMED: 1, CHECK_IN: 2, CHECK_OUT: 3, CANCELLED: 4, DECLINED: 5 };
        return (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9);
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("groupBookings.title")}</h1>
        <p className="text-muted-foreground">{t("groupBookings.subtitle")}</p>
      </div>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">{t("groupBookings.tabBookings")}</TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            {t("groupBookings.tabRequests")}
            {newRequestsCount > 0 && (
              <Badge className="h-5 px-1.5 text-xs bg-fuchsia-500 text-white">{newRequestsCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calculations">{t("groupBookings.tabCalc")}</TabsTrigger>
        </TabsList>

        {/* ── Group Bookings Tab ──────────────────────────────────────────────── */}
        <TabsContent value="bookings" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{t("groupBookings.tabBookings")}</h2>
            {!isViewer && (
              <Button onClick={() => setIsCreateGroupOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />{t("groupBookings.create")}
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("groupBookings.search")}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("bookings.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("bookings.allStatuses")}</SelectItem>
                {["PENDING", "CONFIRMED", "CHECK_IN", "CHECK_OUT", "CANCELLED", "DECLINED"].map(s => (
                  <SelectItem key={s} value={s}>{statusLabel(s, t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("groupBookings.sortNewest")}</SelectItem>
                <SelectItem value="checkIn">{t("groupBookings.sortCheckIn")}</SelectItem>
                <SelectItem value="status">{t("groupBookings.sortStatus")}</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-36", filterFrom && "border-primary")}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {filterFrom ? format(filterFrom, "dd.MM.yy") : t("groupBookings.filterFrom")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={filterFrom} onSelect={setFilterFrom} locale={dateLocale} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-36", filterTo && "border-primary")}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {filterTo ? format(filterTo, "dd.MM.yy") : t("groupBookings.filterTo")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={filterTo} onSelect={setFilterTo} locale={dateLocale} />
              </PopoverContent>
            </Popover>
            {hasFilters && (
              <Button variant="ghost" size="sm"
                onClick={() => { setSearchQuery(""); setFilterStatus("all"); setFilterFrom(undefined); setFilterTo(undefined); }}>
                <X className="h-4 w-4 mr-1" />{t("groupBookings.clearFilters")}
              </Button>
            )}
          </div>

          {bookingsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : !filteredBookings.length ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">{t("groupBookings.noBookings")}</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map(booking => {
                const nights = differenceInDays(parseISO(booking.check_out_date), parseISO(booking.check_in_date));
                return (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-foreground">{booking.booking_name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(booking.status)}`}>
                              {statusLabel(booking.status, t)}
                            </span>
                            {booking.created_by_admin_id && adminProfiles?.get(booking.created_by_admin_id) && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                <span className="opacity-60">👤</span>
                                {t("groupBookings.processedBy")}: <span className="font-medium text-foreground">{adminProfiles.get(booking.created_by_admin_id)}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{booking.contact_person}{booking.phone ? ` · ${booking.phone}` : ""}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(booking.check_in_date), "dd MMM yyyy", { locale: dateLocale })} —{" "}
                            {format(parseISO(booking.check_out_date), "dd MMM yyyy", { locale: dateLocale })} · {nights} {t("groupBookings.nights")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking.num_guests} {t("groupBookings.guests")} · {booking.room_unit_ids.length} {t("bookings.rooms")}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-bold text-lg">{hotelConfig.currencySymbol}{Number(booking.total_price).toLocaleString()}</p>
                          {(booking.deposit_amount ?? 0) > 0 && (
                            <div className="text-xs text-right text-muted-foreground space-y-0.5">
                              <span className="block">{t("groupBookings.depositAmount")}: <span className="text-green-600 font-medium">−{hotelConfig.currencySymbol}{Number(booking.deposit_amount).toLocaleString()}</span></span>
                              <span className="block font-semibold text-foreground">{t("groupBookings.remainingBalance")}: {hotelConfig.currencySymbol}{Math.max(0, Number(booking.total_price) - Number(booking.deposit_amount)).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap justify-end">
                            {!isViewer && booking.status === "PENDING" && (
                              <>
                                <Button size="sm"
                                  onClick={() => statusMutation.mutate({ id: booking.id, status: "CONFIRMED" })}
                                  disabled={statusMutation.isPending}>
                                  <Check className="h-4 w-4 mr-1" />{t("groupBookings.confirm")}
                                </Button>
                                <Button size="sm" variant="destructive"
                                  onClick={() => statusMutation.mutate({ id: booking.id, status: "CANCELLED" })}
                                  disabled={statusMutation.isPending}>
                                  <X className="h-4 w-4 mr-1" />{t("groupBookings.decline")}
                                </Button>
                              </>
                            )}
                            {!isViewer && booking.status === "CONFIRMED" && (
                              <>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => statusMutation.mutate({ id: booking.id, status: "CHECK_IN" })}
                                  disabled={statusMutation.isPending}>
                                  <LogIn className="h-4 w-4 mr-1" />{t("groupBookings.checkInAction")}
                                </Button>
                                <Button size="sm" variant="destructive"
                                  onClick={() => statusMutation.mutate({ id: booking.id, status: "CANCELLED" })}
                                  disabled={statusMutation.isPending}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {!isViewer && booking.status === "CHECK_IN" && (
                              <Button size="sm" variant="outline"
                                onClick={() => statusMutation.mutate({ id: booking.id, status: "CHECK_OUT" })}
                                disabled={statusMutation.isPending}>
                                <LogOut className="h-4 w-4 mr-1" />{t("groupBookings.checkOutAction")}
                              </Button>
                            )}
                            <Button size="sm" variant="outline"
                              onClick={() => { setSelectedDetailTab("view"); setSelectedDetailBookingId(booking.id); }}>
                              <Users className="h-4 w-4 mr-1" />{t("groupBookings.details")}
                            </Button>
                            {!isViewer && (
                              <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteBookingId(booking.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Requests Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="requests" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">{t("groupBookings.tabRequests")}</h2>
              <p className="text-sm text-muted-foreground">
                {lang === "uk"
                  ? "Заявки, що надійшли через сайт. Обробіть та конвертуйте у бронювання."
                  : "Requests submitted via the website. Process and convert to bookings."}
              </p>
            </div>
            {newRequestsCount > 0 && (
              <span className="text-sm font-medium text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200 px-3 py-1.5 rounded-full">
                {newRequestsCount} {lang === "uk" ? "нових" : "new"}
              </span>
            )}
          </div>

          {requestsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
          ) : !(groupRequests ?? []).length ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                {t("groupBookings.requestNoRequests")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(groupRequests ?? []).map(req => (
                <GroupBookingRequestCard
                  key={req.id}
                  req={req}
                  lang={lang}
                  dateLocale={dateLocale}
                  isViewer={isViewer}
                  onSave={handleSaveRequest}
                  isSaving={savingRequestId === req.id}
                  onConvert={setConvertingRequest}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Calculations Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="calculations" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{t("calculations.title")}</h2>
            {!isViewer && (
              <Button onClick={() => { setEditingCalc(null); setIsCalcDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />{t("calculations.add")}
              </Button>
            )}
          </div>

          {calcsLoading ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : !calculations?.length ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">{t("calculations.noCalcs")}</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {calculations.map(calc => (
                <Card key={calc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{calc.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {calc.price_per_person_per_night} {t("calculations.uahPerPersonNight")}
                        </p>
                        {calc.services && calc.services.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {calc.services.map(s => (
                              <Badge key={s.id} variant="secondary" className="text-xs">
                                {s.service_name}{s.cost != null ? ` — ${s.cost} грн` : ""}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {!isViewer && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setEditingCalc(calc); setIsCalcDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteCalcId(calc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ───────────────────────────────────────────────────────────── */}

      <CalendarGroupDialog
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        selectedRoomUnits={[]}
        hideStandardTab
      />

      {convertingRequest && (
        <CalendarGroupDialog
          open={!!convertingRequest}
          onOpenChange={open => { if (!open) setConvertingRequest(null); }}
          selectedRoomUnits={[]}
          hideStandardTab
          initialCheckIn={parseISO(convertingRequest.check_in)}
          initialCheckOut={parseISO(convertingRequest.check_out)}
          initialContactPerson={convertingRequest.guest_name}
          initialPhone={convertingRequest.guest_phone}
          initialGroupGuests={String(convertingRequest.num_guests)}
          initialBookingName={`${convertingRequest.guest_name} — ${format(parseISO(convertingRequest.check_in), "dd.MM.yyyy")}`}
          onCreated={handleRequestConverted}
        />
      )}

      <GroupBookingDetailsDialog
        booking={selectedDetailBooking}
        onClose={() => setSelectedDetailBookingId(null)}
        defaultTab={selectedDetailTab}
      />

      <CalculationDialog
        open={isCalcDialogOpen}
        onOpenChange={open => { setIsCalcDialogOpen(open); if (!open) setEditingCalc(null); }}
        editCalc={editingCalc}
      />

      <Dialog open={!!deleteBookingId} onOpenChange={() => setDeleteBookingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("groupBookings.confirmDelete")}</DialogTitle>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteBookingId(null)}>{t("groupBookings.cancel")}</Button>
            <Button variant="destructive" disabled={deleteBookingMutation.isPending}
              onClick={() => deleteBookingId && deleteBookingMutation.mutate(deleteBookingId)}>
              <Trash2 className="h-4 w-4 mr-1" />{t("groupBookings.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCalcId} onOpenChange={() => setDeleteCalcId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("calculations.confirmDelete")}</DialogTitle>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteCalcId(null)}>{t("calculations.cancel")}</Button>
            <Button variant="destructive" disabled={deleteCalcMutation.isPending}
              onClick={() => deleteCalcId && deleteCalcMutation.mutate(deleteCalcId)}>
              <Trash2 className="h-4 w-4 mr-1" />{t("calculations.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
