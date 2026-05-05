import { format, parseISO } from "date-fns";
import type { Locale } from "date-fns/locale";
import type { GroupBooking, GroupBookingRoomAssignment } from "@/lib/supabase-types";
import type { RoomUnitFull } from "@/hooks/useGroupBookingDetailsData";

export interface SavedViewData {
  total_price: number;
  deposit_amount: number | null;
  num_guests: number;
}

interface Props {
  booking: GroupBooking;
  bookingRooms: RoomUnitFull[];
  assignments: GroupBookingRoomAssignment[] | undefined;
  bookingCalc: { price_per_person_per_night: number } | null | undefined;
  nights: number;
  language: string;
  dateLocale: Locale;
  t: (k: string) => string;
  savedViewData: SavedViewData | null;
  numGuestsDraft: Record<string, string>;
  extraAccomDraft: Record<string, string>;
  ubdCheckedDraft: Record<string, boolean[]>;
}

export function GroupBookingViewTab({
  booking, bookingRooms, assignments, bookingCalc, nights,
  language, dateLocale, t, savedViewData, numGuestsDraft, extraAccomDraft, ubdCheckedDraft,
}: Props) {
  const derivedNumGuests = bookingRooms.length > 0
    ? bookingRooms.reduce((sum, r) =>
        sum + (parseInt(numGuestsDraft[r.id] || "1") || 1) + (parseInt(extraAccomDraft[r.id] || "0") || 0), 0)
    : (savedViewData?.num_guests ?? booking.num_guests);

  const derivedTotal = bookingCalc && nights > 0
    ? (() => {
        const pppn = bookingCalc.price_per_person_per_night;
        const ubdCount = bookingRooms.reduce((sum, r) => {
          const count = parseInt(numGuestsDraft[r.id] || "1") || 1;
          return sum + (ubdCheckedDraft[r.id] ?? []).filter((checked, i) => checked && i < count).length;
        }, 0);
        return Number((pppn * nights * (derivedNumGuests - ubdCount * 0.2)).toFixed(2));
      })()
    : (savedViewData?.total_price ?? Number(booking.total_price));

  const effectiveDeposit = savedViewData ? savedViewData.deposit_amount : booking.deposit_amount;
  const feesTotal = (assignments ?? []).reduce(
    (sum, a) => sum + Number(a.early_checkin_fee ?? 0) + Number(a.late_checkout_fee ?? 0), 0
  );
  const grandTotal = derivedTotal + feesTotal;
  const deposit = (effectiveDeposit ?? 0) > 0 ? Number(effectiveDeposit) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-muted/50 rounded-md p-3 space-y-0.5">
          <p className="text-muted-foreground text-xs">{t("bookings.checkIn")} / {t("bookings.checkOut")}</p>
          <p className="font-medium">
            {format(parseISO(booking.check_in_date), "dd MMM yyyy", { locale: dateLocale })} –{" "}
            {format(parseISO(booking.check_out_date), "dd MMM yyyy", { locale: dateLocale })}
          </p>
          <p className="text-muted-foreground text-xs">{nights} {t("groupBookings.nights")}</p>
        </div>
        <div className="bg-muted/50 rounded-md p-3 space-y-0.5">
          <p className="text-muted-foreground text-xs">{t("bookings.grandTotal")}</p>
          <p className="font-bold text-lg">{grandTotal.toLocaleString()} UAH</p>
          {feesTotal > 0 && (
            <p className="text-xs text-muted-foreground">
              {derivedTotal.toLocaleString()} + {feesTotal.toLocaleString()} UAH {t("groupBookings.feesTotal")}
            </p>
          )}
          {deposit > 0 && (
            <>
              <p className="text-xs text-green-600">
                {t("groupBookings.depositAmount")}: −{deposit.toLocaleString()} UAH
              </p>
              <p className="text-xs font-semibold text-foreground">
                {t("groupBookings.remainingBalance")}: {Math.max(0, grandTotal - deposit).toLocaleString()} UAH
              </p>
            </>
          )}
          <p className="text-muted-foreground text-xs mt-0.5">{derivedNumGuests} {t("groupBookings.guests")}</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">{t("groupBookings.roomAssignments")}</h4>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">{t("groupBookings.roomNo")}</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">{t("groupBookings.roomType")}</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">{t("groupBookings.guestNames")}</th>
              </tr>
            </thead>
            <tbody>
              {bookingRooms.map((room, idx) => {
                const assign = assignments?.find(a => a.room_unit_id === room.id);
                const names      = assign?.guest_names      ?? [];
                const extraNames = assign?.extra_guest_names ?? [];
                const extraCount = assign?.extra_accommodation ?? 0;
                const ubdDocs    = assign?.ubd_documents      ?? [];
                return (
                  <tr key={room.id} className={idx % 2 === 0 ? "" : "bg-muted/20"}>
                    <td className="px-3 py-2 font-medium align-top">
                      {room.room_number}
                      {(assign?.check_in_override || assign?.check_out_override) && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {assign.check_in_override && (
                            <span>{t("bookings.checkIn")}: {format(parseISO(assign.check_in_override), "dd.MM", { locale: dateLocale })}</span>
                          )}
                          {assign.check_in_override && assign.check_out_override && " – "}
                          {assign.check_out_override && (
                            <span>{format(parseISO(assign.check_out_override), "dd.MM", { locale: dateLocale })}</span>
                          )}
                        </div>
                      )}
                      {assign?.room_notes && (
                        <div className="text-[10px] text-muted-foreground italic mt-0.5 max-w-[80px] truncate" title={assign.room_notes}>
                          {assign.room_notes}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground align-top">
                      {language === "uk" ? (room.room_type?.name_uk || room.room_type?.name) : room.room_type?.name}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {names.length > 0 ? (
                        <ul className="space-y-0.5">
                          {names.map((name, i) => (
                            <li key={i} className="text-xs flex items-center gap-1.5 flex-wrap">
                              <span className="text-muted-foreground">{i + 1}.</span>
                              {name || <span className="italic text-muted-foreground">—</span>}
                              {ubdDocs[i]?.trim() && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                  УБД
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : <span className="text-muted-foreground">—</span>}
                      {extraCount > 0 && (
                        <ul className="space-y-0.5 mt-1">
                          {Array.from({ length: extraCount }, (_, i) => (
                            <li key={i} className="text-xs text-amber-700">
                              <span className="text-muted-foreground mr-1">+{i + 1}.</span>
                              {extraNames[i] || <span className="italic text-muted-foreground">—</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {booking.admin_notes && (
        <div className="bg-muted/30 rounded-md p-3 text-sm">
          <p className="text-muted-foreground text-xs mb-1">{t("bookings.adminNotes")}</p>
          <p>{booking.admin_notes}</p>
        </div>
      )}
    </div>
  );
}
