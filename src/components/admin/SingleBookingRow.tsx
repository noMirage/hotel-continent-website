import { format } from "date-fns";
import { fromLocalDateString } from "@/lib/date-utils";
import type { Locale } from "date-fns/locale";
import { Check, X, Eye, LogIn, LogOut, Trash2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hotelConfig } from "@/config/hotel";
import { statusBadgeClass } from "@/lib/booking-status";
import type { Reservation, BookingStatus, EventType } from "@/lib/supabase-types";

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

function isProtectedStatus(status: BookingStatus): boolean {
  return status === "CHECK_IN" || status === "CHECK_OUT";
}

function getHandlerName(booking: Reservation, profiles: Map<string, string> | undefined): string | null {
  if (!profiles) return null;
  if (booking.booking_source === "ADMIN") {
    const id = booking.created_by_admin_id;
    return id ? (profiles.get(id) ?? null) : null;
  }
  if (booking.status === "UNPROCESSED") return null;
  const confirmedId = booking.confirmed_by_admin_id;
  if (confirmedId && profiles.has(confirmedId)) return profiles.get(confirmedId)!;
  const assignedId = booking.assigned_admin_id;
  if (assignedId && profiles.has(assignedId)) return profiles.get(assignedId)!;
  return null;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "SITE") return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Web</span>;
  if (source === "AI")   return <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">AI</span>;
  return null;
}

function BanquetBadge({ t }: { t: (k: string) => string }) {
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700 font-semibold uppercase tracking-wide">
      {t("banquet.badge")}
    </span>
  );
}

function eventTypeLabel(type: EventType | null | undefined, t: (k: string) => string): string {
  if (!type) return "—";
  return t(`banquet.eventType.${type}`);
}

interface Props {
  booking: Reservation;
  adminProfiles: Map<string, string> | undefined;
  dateLocale: Locale;
  t: (k: string) => string;
  isViewer: boolean;
  isSuperAdmin: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateStatusMutation: any;
  roomLabel?: string;
  onView: () => void;
  onViewForm: () => void;
  onCheckin: () => void;
  onDeleteCheckin: () => void;
  onStatusChange: (id: string, status: BookingStatus, currentStatus?: BookingStatus) => void;
  onConfirm: () => void;
}

export function SingleBookingRow({
  booking, adminProfiles, dateLocale, t, isViewer, isSuperAdmin,
  updateStatusMutation, roomLabel,
  onView, onViewForm, onCheckin, onDeleteCheckin, onStatusChange, onConfirm,
}: Props) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6">
      <div className="flex-1">
        <div className="flex items-start flex-wrap justify-between lg:justify-start lg:gap-3 mb-2 gap-2">
          <h3 className="font-semibold text-foreground">
            {booking.guest_name}
            {roomLabel && <span className="ml-2 text-xs text-muted-foreground font-normal">#{roomLabel}</span>}
          </h3>
          {booking.type === "banquet" && <BanquetBadge t={t} />}
          <SourceBadge source={booking.booking_source} />
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(booking.status)}`}>
            {statusLabel(booking.status, t)}
          </span>
          {(() => {
            const handler = getHandlerName(booking, adminProfiles);
            return handler ? (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                <span className="opacity-60">👤</span>
                {t("bookings.processedBy")}: <span className="font-medium text-foreground">{handler}</span>
              </span>
            ) : null;
          })()}
        </div>
        {booking.guest_email && <p className="text-sm text-muted-foreground mb-1">{booking.guest_email}</p>}
        {booking.guest_phone && !booking.guest_email && <p className="text-sm text-muted-foreground mb-1">{booking.guest_phone}</p>}
        {booking.type === "banquet" ? (
          <p className="text-sm text-muted-foreground">
            {eventTypeLabel(booking.event_type, t)} — {format(fromLocalDateString(booking.check_in_date), "dd.MM.yyyy", { locale: dateLocale })}
            {" · "}{booking.guests_count ?? booking.num_guests} {t("bookings.guest")}s
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {format(fromLocalDateString(booking.check_in_date), "dd MMM yyyy", { locale: dateLocale })} -{" "}
            {format(fromLocalDateString(booking.check_out_date), "dd MMM yyyy", { locale: dateLocale })}
            {" • "}{booking.num_guests} {t("bookings.guest")}{booking.num_guests > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="text-left lg:text-right">
          <p className="font-bold text-lg text-foreground">
            {hotelConfig.currencySymbol}{Number(booking.total_price).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("bookings.booked")} {format(new Date(booking.created_at), "dd MMM yyyy", { locale: dateLocale })}
          </p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onView}>
            <Eye className="h-4 w-4" />
          </Button>

          {(booking.status === "CHECK_IN" || booking.status === "CHECK_OUT") && (
            <Button size="sm" variant="outline" onClick={onViewForm} title={t("bookings.checkInForm")}>
              <ClipboardList className="h-4 w-4" />
            </Button>
          )}

          {booking.status === "UNPROCESSED" && !isViewer && (
            <>
              <Button size="sm"
                onClick={() => onStatusChange(booking.id, "PENDING", "UNPROCESSED")}
                disabled={updateStatusMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                {t("bookings.accept")}
              </Button>
              <Button size="sm" variant="destructive"
                onClick={() => onStatusChange(booking.id, "DECLINED", "UNPROCESSED")}
                disabled={updateStatusMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                {t("bookings.decline")}
              </Button>
            </>
          )}

          {booking.status === "PENDING" && !isViewer && (
            <>
              <Button size="sm"
                onClick={onConfirm}
                disabled={updateStatusMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                {t("bookings.confirm")}
              </Button>
              <Button size="sm" variant="destructive"
                onClick={() => onStatusChange(booking.id, "DECLINED")}
                disabled={updateStatusMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                {t("bookings.decline")}
              </Button>
            </>
          )}

          {booking.status === "CONFIRMED" && !isViewer && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={onCheckin}>
              <LogIn className="h-4 w-4 mr-1" />
              {t("bookings.checkInAction")}
            </Button>
          )}

          {booking.status === "CHECK_IN" && !isViewer && (
            <Button size="sm" variant="outline" className="border-stone-400 text-stone-700 hover:bg-stone-100"
              onClick={() => onStatusChange(booking.id, "CHECK_OUT")}
              disabled={updateStatusMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-1" />
              {t("bookings.checkOutStatus")}
            </Button>
          )}

          {isProtectedStatus(booking.status) && isSuperAdmin && !isViewer && (
            <Button size="sm" variant="destructive" onClick={onDeleteCheckin}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
