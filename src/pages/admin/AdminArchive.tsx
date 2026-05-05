import { useState } from "react";
import { useAdminArchiveBookings, type ArchiveBooking } from "@/hooks/useAdminArchiveData";
import { format, differenceInDays, parseISO, startOfDay, endOfDay } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { Search, Archive, Eye, X, CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { hotelConfig } from "@/config/hotel";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIsSuperAdmin, useIsOwner } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useHotelSettings } from "@/hooks/useHotelSettings";

function sourceLabel(source: string): { label: string; cls: string } | null {
  if (source === "SITE") return { label: "Web", cls: "bg-blue-100 text-blue-700" };
  if (source === "AI")   return { label: "AI", cls: "bg-purple-100 text-purple-700" };
  return null;
}

function BookingDetailsDialog({
  booking,
  onClose,
}: {
  booking: ArchiveBooking | null;
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { data: hotelSettings } = useHotelSettings();

  if (!booking) return null;

  const nights = differenceInDays(parseISO(booking.check_out_date), parseISO(booking.check_in_date));
  const ttRate = hotelSettings?.tourist_tax_rate ?? 41.5;
  const tt = booking.tourist_tax_amount > 0
    ? booking.tourist_tax_amount
    : ttRate * booking.num_guests * nights;
  const earlyFee = Number(booking.early_checkin_fee ?? 0);
  const lateFee  = Number(booking.late_checkout_fee ?? 0);
  const grandTotal = Number(booking.total_price) + tt + earlyFee + lateFee;
  const roomName = booking.room_unit?.room_number ?? "—";
  const typeName = booking.room_unit?.room_type
    ? (language === "uk" ? (booking.room_unit.room_type.name_uk || booking.room_unit.room_type.name) : booking.room_unit.room_type.name)
    : "—";

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );

  return (
    <Dialog open={!!booking} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("archive.bookingDetails")}
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive">
              {t("bookings.cancelled")}
            </span>
          </DialogTitle>
          <DialogDescription>
            {t("archive.cancelledOn")} {format(new Date(booking.updated_at), "dd MMM yyyy", { locale: dateLocale })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Row label={t("bookings.guestName")} value={booking.guest_name} />
          <Row label={t("bookings.email")} value={booking.guest_email} />
          <Row label={t("bookings.phone")} value={booking.guest_phone || t("common.na")} />
          <Row label={t("bookings.guests")} value={String(booking.num_guests)} />
          <Row label={t("bookings.checkIn")} value={format(parseISO(booking.check_in_date), "dd MMM yyyy", { locale: dateLocale })} />
          <Row label={t("bookings.checkOut")} value={format(parseISO(booking.check_out_date), "dd MMM yyyy", { locale: dateLocale })} />
          <Row label={t("roomManager.number")} value={roomName} />
          <Row label={t("roomManager.type")} value={typeName} />
          <Row label={t("bookings.accommodation")} value={`${hotelConfig.currencySymbol}${Number(booking.total_price).toLocaleString()}`} />
          <Row
            label={t("bookings.touristTax")}
            value={`${hotelConfig.currencySymbol}${tt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          {earlyFee > 0 && <Row label={t("bookings.earlyCheckin")} value={`${hotelConfig.currencySymbol}${earlyFee.toLocaleString()}`} />}
          {lateFee > 0  && <Row label={t("bookings.lateCheckout")} value={`${hotelConfig.currencySymbol}${lateFee.toLocaleString()}`} />}
          <div className="col-span-2 border-t border-border pt-2">
            <span className="text-xs text-muted-foreground">{t("bookings.grandTotal")}</span>
            <p className="text-base font-bold text-foreground">{hotelConfig.currencySymbol}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          {booking.deposit_amount != null && (
            <>
              <Row label={t("bookings.depositAmount")} value={`${hotelConfig.currencySymbol}${Number(booking.deposit_amount).toLocaleString()}`} />
              <Row
                label={t("bookings.remainingBalance")}
                value={`${hotelConfig.currencySymbol}${Math.max(0, Number(booking.total_price) + earlyFee + lateFee - Number(booking.deposit_amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + ${t("bookings.touristTax")} (${t("bookings.touristTaxOnSite")})`}
              />
            </>
          )}
          {booking.payment_method && (
            <Row
              label={t("bookings.paymentMethod")}
              value={booking.payment_method === "cash" ? t("bookings.paymentCash") : t("bookings.paymentCard")}
            />
          )}
        </div>

        {booking.special_requests && (
          <div className="border-t border-border pt-3 mt-1">
            <p className="text-xs text-muted-foreground mb-1">{t("bookings.specialRequests")}</p>
            <p className="text-sm bg-muted rounded-md p-2">{booking.special_requests}</p>
          </div>
        )}
        {booking.admin_notes && (
          <div className="border-t border-border pt-3 mt-1">
            <p className="text-xs text-muted-foreground mb-1">{t("bookings.adminNotes")}</p>
            <p className="text-sm bg-muted rounded-md p-2">{booking.admin_notes}</p>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> {t("adminRooms.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminArchive() {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { isSuperAdmin, isLoading: roleLoading } = useIsSuperAdmin();
  const { isOwner, isLoading: ownerLoading } = useIsOwner();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<ArchiveBooking | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const canView = isSuperAdmin || isOwner;
  const isRoleLoading = roleLoading || ownerLoading;

  // Guard: only super admin or owner
  useEffect(() => {
    if (!isRoleLoading && !canView) navigate("/admin/dashboard");
  }, [canView, isRoleLoading, navigate]);

  const { data: bookings, isLoading } = useAdminArchiveBookings(canView);

  const filtered = bookings?.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = b.guest_name.toLowerCase().includes(q) || b.guest_email.toLowerCase().includes(q);
    const checkInDate = new Date(b.check_in_date);
    const matchesFrom = !dateFrom || checkInDate >= startOfDay(dateFrom);
    const matchesTo   = !dateTo   || checkInDate <= endOfDay(dateTo);
    return matchesSearch && matchesFrom && matchesTo;
  });

  if (isRoleLoading || isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.archive")}</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Archive className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("archive.title")}</h1>
          <p className="text-muted-foreground">{t("archive.subtitle")}</p>
        </div>
      </div>

      {/* Search + Date filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("bookings.searchGuests")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Date from */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateFrom ? format(dateFrom, "dd MMM yyyy", { locale: dateLocale }) : t("archive.filterFrom")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
          </PopoverContent>
        </Popover>

        {/* Date to */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateTo ? format(dateTo, "dd MMM yyyy", { locale: dateLocale }) : t("archive.filterTo")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
          </PopoverContent>
        </Popover>

        {/* Clear */}
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
            <X className="h-3.5 w-3.5 mr-1" />{t("archive.clearDates")}
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {filtered && filtered.length > 0 ? (
          filtered.map((booking) => {
            const src = sourceLabel(booking.booking_source);
            return (
              <Card key={booking.id} className="overflow-hidden opacity-80">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{booking.guest_name}</h3>
                        {src && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${src.cls}`}>
                            {src.label}
                          </span>
                        )}
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                          {t("bookings.cancelled")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.check_in_date), "dd MMM yyyy", { locale: dateLocale })} -{" "}
                        {format(new Date(booking.check_out_date), "dd MMM yyyy", { locale: dateLocale })}
                        {" • "}{booking.num_guests} {t("bookings.guest")}{booking.num_guests > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex flex-col lg:items-end gap-2">
                      <div className="text-left lg:text-right">
                        <p className="font-bold text-lg text-foreground">
                          {hotelConfig.currencySymbol}{Number(booking.total_price).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("archive.cancelledOn")} {format(new Date(booking.updated_at), "dd MMM yyyy", { locale: dateLocale })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedBooking(booking)}
                        className="flex items-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t("archive.viewDetails")}
                      </Button>
                    </div>
                  </div>
                  {booking.admin_notes && (
                    <div className="px-6 pb-4 border-t border-border/50 pt-3">
                      <p className="text-xs text-muted-foreground">{t("bookings.adminNotes")}: {booking.admin_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Archive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("archive.empty")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <BookingDetailsDialog booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
    </div>
  );
}
