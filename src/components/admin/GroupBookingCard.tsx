import { useState } from "react";
import { format } from "date-fns";
import { fromLocalDateString } from "@/lib/date-utils";
import type { Locale } from "date-fns/locale";
import { Check, X, Eye, LogIn, LogOut, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hotelConfig } from "@/config/hotel";
import { statusBadgeClass } from "@/lib/booking-status";
import type { Reservation, BookingStatus } from "@/lib/supabase-types";
import { SingleBookingRow } from "./SingleBookingRow";

function statusLabel(status: BookingStatus, t: (k: string) => string): string {
  switch (status) {
    case "UNPROCESSED": return t("bookings.unprocessed");
    case "CHECK_IN":    return t("bookings.checkInStatus");
    case "CHECK_OUT":   return t("bookings.checkOutStatus");
    case "PENDING":     return t("bookings.pending");
    case "CONFIRMED":   return t("bookings.confirmed");
    case "DECLINED":    return t("bookings.declined");
    case "CANCELLED":   return t("bookings.cancelled");
    default:            return status;
  }
}

interface Props {
  groupId: string;
  bookings: Reservation[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  adminProfiles: Map<string, string> | undefined;
  roomNumberMap: Map<string, string>;
  dateLocale: Locale;
  t: (k: string) => string;
  isViewer: boolean;
  isSuperAdmin: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateStatusMutation: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bulkUpdateStatusMutation: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  groupConfirmMutation: any;
  onViewDetail: () => void;
  onCheckinPayment: (booking: Reservation) => void;
  onCheckinAll: (bookings: Reservation[]) => void;
  onDeleteCheckin: (booking: Reservation) => void;
  onViewForm: (booking: Reservation) => void;
  onViewBooking: (booking: Reservation) => void;
}

interface GroupConfirmState {
  bookings: Reservation[];
  depositInput: string;
  paymentMethod: string;
}

export function GroupBookingCard({
  groupId, bookings: grpBookings, isExpanded, onToggleExpand,
  adminProfiles, roomNumberMap, dateLocale, t, isViewer, isSuperAdmin,
  updateStatusMutation, bulkUpdateStatusMutation, groupConfirmMutation,
  onViewDetail, onCheckinPayment, onCheckinAll, onDeleteCheckin, onViewForm, onViewBooking,
}: Props) {
  const [groupConfirmDialog, setGroupConfirmDialog] = useState<GroupConfirmState | null>(null);

  // ── Derived values ─────────────────────────────────────────────────────────
  const contactPerson  = grpBookings[0].guest_name;
  const checkIn        = grpBookings[0].check_in_date;
  const checkOut       = grpBookings[0].check_out_date;
  const createdAt      = grpBookings[0].created_at;
  const totalPrice     = grpBookings.reduce((s, b) => s + Number(b.total_price), 0);
  const numGuests      = grpBookings.reduce((s, b) => s + b.num_guests, 0);
  const roomNumbers    = grpBookings.map(b => roomNumberMap.get(b.room_unit_id) ?? b.room_unit_id);
  const allSameStatus  = grpBookings.every(b => b.status === grpBookings[0].status);
  const groupStatus    = allSameStatus ? grpBookings[0].status : null;

  // ── Bulk action eligibility ────────────────────────────────────────────────
  const bulkAcceptIds   = grpBookings.filter(b => b.status === "UNPROCESSED").map(b => b.id);
  const canAcceptAll    = !isViewer && bulkAcceptIds.length > 0;
  const pendingBookings = grpBookings.filter(b => b.status === "PENDING");
  const canConfirmAll   = !isViewer && pendingBookings.length > 0;
  const bulkDeclineIds  = grpBookings.filter(b => ["UNPROCESSED", "PENDING", "CONFIRMED"].includes(b.status)).map(b => b.id);
  const canDeclineAll   = !isViewer && bulkDeclineIds.length > 0;
  const checkinAll      = grpBookings.filter(b => b.status === "CONFIRMED");
  const canCheckinAll   = !isViewer && checkinAll.length > 0;
  const checkoutAllIds  = grpBookings.filter(b => b.status === "CHECK_IN").map(b => b.id);
  const canCheckoutAll  = !isViewer && checkoutAllIds.length > 0;

  const handleStatusChange = (id: string, status: BookingStatus, currentStatus?: BookingStatus) => {
    updateStatusMutation.mutate({ id, status, currentStatus });
  };

  // ── Confirm-all dialog ─────────────────────────────────────────────────────
  const dep         = Number(groupConfirmDialog?.depositInput) || 0;
  const totalAccom  = groupConfirmDialog?.bookings.reduce((s, b) => s + Number(b.total_price), 0) ?? 0;
  const remaining   = Math.max(0, totalAccom - dep);

  return (
    <div className="space-y-1">
      {/* ── Group header card ──────────────────────────────────────────────── */}
      <Card className="overflow-hidden border-primary/30">
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6">
            <div className="flex-1">
              <div className="flex items-start flex-wrap justify-between lg:justify-start lg:gap-3 mb-2 gap-2">
                <h3 className="font-semibold text-foreground">{contactPerson}</h3>
                <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">
                  {t("bookings.groupBooking")}
                </span>
                {groupStatus ? (
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(groupStatus)}`}>
                    {statusLabel(groupStatus, t)}
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    {grpBookings.map(b => statusLabel(b.status, t)).join(" / ")}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-1">{grpBookings[0].guest_email}</p>
              <p className="text-sm text-muted-foreground mb-1">
                {format(fromLocalDateString(checkIn), "dd MMM yyyy", { locale: dateLocale })} -{" "}
                {format(fromLocalDateString(checkOut), "dd MMM yyyy", { locale: dateLocale })}
                {" • "}{numGuests} {t("bookings.guest")}{numGuests > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("bookings.rooms")}: {roomNumbers.join(", ")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-left lg:text-right">
                <p className="font-bold text-lg text-foreground">
                  {hotelConfig.currencySymbol}{totalPrice.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("bookings.booked")} {format(new Date(createdAt), "dd MMM yyyy", { locale: dateLocale })}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={onViewDetail}>
                  <Eye className="h-4 w-4" />
                </Button>

                {canAcceptAll && (
                  <Button size="sm"
                    onClick={() => bulkUpdateStatusMutation.mutate({ ids: bulkAcceptIds, status: "PENDING" })}
                    disabled={bulkUpdateStatusMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {t("bookings.acceptAll")}
                  </Button>
                )}

                {canConfirmAll && (
                  <Button size="sm"
                    onClick={() => {
                      const total = pendingBookings.reduce((s, b) => s + Number(b.total_price), 0);
                      setGroupConfirmDialog({
                        bookings: pendingBookings,
                        depositInput: String(Math.round(total * 0.5)),
                        paymentMethod: "cash",
                      });
                    }}
                    disabled={groupConfirmMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {t("bookings.confirmAll")}
                  </Button>
                )}

                {canDeclineAll && (
                  <Button size="sm" variant="destructive"
                    onClick={() => bulkUpdateStatusMutation.mutate({ ids: bulkDeclineIds, status: "DECLINED" })}
                    disabled={bulkUpdateStatusMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t("bookings.declineAll")}
                  </Button>
                )}

                {canCheckinAll && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onCheckinAll(checkinAll)}
                  >
                    <LogIn className="h-4 w-4 mr-1" />
                    {t("bookings.checkInAll")}
                  </Button>
                )}

                {canCheckoutAll && (
                  <Button size="sm" variant="outline" className="border-stone-400 text-stone-700 hover:bg-stone-100"
                    onClick={() => bulkUpdateStatusMutation.mutate({ ids: checkoutAllIds, status: "CHECK_OUT" })}
                    disabled={bulkUpdateStatusMutation.isPending}
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    {t("bookings.checkOutAll")}
                  </Button>
                )}

                <Button size="sm" variant="outline" onClick={onToggleExpand}>
                  {isExpanded
                    ? <><ChevronUp className="h-4 w-4 mr-1" />{t("bookings.hideDetails")}</>
                    : <><ChevronDown className="h-4 w-4 mr-1" />{t("bookings.moreDetails")}</>
                  }
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Sub-cards (expanded) ───────────────────────────────────────────── */}
      {isExpanded && (
        <div className="ml-6 space-y-1 border-l-2 border-primary/20 pl-4">
          {grpBookings.map(booking => (
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
                  roomLabel={roomNumberMap.get(booking.room_unit_id)}
                  onView={() => onViewBooking(booking)}
                  onViewForm={() => onViewForm(booking)}
                  onCheckin={() => onCheckinPayment(booking)}
                  onDeleteCheckin={() => onDeleteCheckin(booking)}
                  onStatusChange={handleStatusChange}
                  onConfirm={() => onViewBooking(booking)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Group confirm (deposit) dialog ─────────────────────────────────── */}
      {groupConfirmDialog && (
        <Dialog open onOpenChange={() => setGroupConfirmDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("bookings.confirmAll")}</DialogTitle>
              <DialogDescription>
                {groupConfirmDialog.bookings.length} {t("bookings.rooms")} · {hotelConfig.currencySymbol}{totalAccom.toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>{t("bookings.depositAmount")} ({hotelConfig.currencySymbol})</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  autoFocus
                  value={groupConfirmDialog.depositInput}
                  onChange={e => setGroupConfirmDialog(prev => prev ? { ...prev, depositInput: e.target.value } : null)}
                />
                {groupConfirmDialog.depositInput !== "" && !isNaN(dep) && (
                  <p className="text-xs text-muted-foreground">
                    {t("bookings.remainingBalance")}: {hotelConfig.currencySymbol}{remaining.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t("bookings.paymentMethod")}</Label>
                <Select
                  value={groupConfirmDialog.paymentMethod}
                  onValueChange={v => setGroupConfirmDialog(prev => prev ? { ...prev, paymentMethod: v } : null)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("bookings.paymentCash")}</SelectItem>
                    <SelectItem value="card">{t("bookings.paymentCard")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setGroupConfirmDialog(null)}>
                {t("guestForm.cancel")}
              </Button>
              <Button
                disabled={groupConfirmDialog.depositInput === "" || isNaN(dep) || groupConfirmMutation.isPending}
                onClick={() => groupConfirmMutation.mutate(
                  {
                    bookings: groupConfirmDialog.bookings,
                    totalDeposit: dep,
                    paymentMethod: groupConfirmDialog.paymentMethod,
                  },
                  { onSuccess: () => setGroupConfirmDialog(null) },
                )}
              >
                <Check className="h-4 w-4 mr-1" />
                {t("bookings.confirmAll")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
