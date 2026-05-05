import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { format, parseISO, differenceInDays } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { CalendarIcon, Edit2, Trash2, LogIn, LogOut, Check, X, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { hotelConfig } from "@/config/hotel";
import { cn } from "@/lib/utils";
import { QK } from "@/lib/queryKeys";
import type { Reservation, BookingStatus, GuestForm } from "@/lib/supabase-types";
import { statusBadgeClass } from "@/lib/booking-status";
import { useBookingAdminProfile } from "@/hooks/useBookingAdminProfile";
import { useCalendarBookingMutation } from "@/hooks/useCalendarBookingMutation";
import { GuestFormDialog } from "@/components/admin/GuestFormDialog";
import { CheckInPaymentDialog } from "@/components/admin/CheckInPaymentDialog";
import { useIsSuperAdmin, useIsViewer } from "@/hooks/useUserRole";
import { useLanguage } from "@/i18n/LanguageContext";

// ─── Color helpers (shared with calendar) ────────────────────────────────────

export function bookingPillClass(status: BookingStatus): string {
  switch (status) {
    case "UNPROCESSED": return "bg-orange-500/50 text-white";
    case "PENDING":   return "bg-amber-500/50 text-white";
    case "CONFIRMED": return "bg-blue-600/50 text-white";
    case "CHECK_IN":  return "bg-green-600/50 text-white";
    case "CHECK_OUT": return "bg-stone-600/50 text-white";
    default:          return "bg-muted text-muted-foreground";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CalendarBookingDialogProps {
  reservation: Reservation | null;
  onClose: () => void;
  /** Called when admin clicks Check-in — parent should open GuestFormDialog */
  onOpenCheckin: (reservation: Reservation) => void;
}

type DialogMode = "view" | "edit" | "delete-confirm";

export function CalendarBookingDialog({
  reservation,
  onClose,
  onOpenCheckin,
}: CalendarBookingDialogProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { isSuperAdmin } = useIsSuperAdmin();
  const { isViewer } = useIsViewer();
  const { data: hotelSettings } = useHotelSettings();

  const [mode, setMode] = useState<DialogMode>("view");
  const [checkoutConfirm, setCheckoutConfirm] = useState(false);

  // Deposit confirm dialog state
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [depositInput, setDepositInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  // Check-in payment dialog state
  const [showCheckinPayment, setShowCheckinPayment] = useState(false);

  // Edit form state
  const [editGuestName, setEditGuestName] = useState("");
  const [editGuestEmail, setEditGuestEmail] = useState("");
  const [editGuestPhone, setEditGuestPhone] = useState("");
  const [editNumGuests, setEditNumGuests] = useState("1");
  const [editCheckIn, setEditCheckIn] = useState<Date | undefined>();
  const [editCheckOut, setEditCheckOut] = useState<Date | undefined>();
  const [editSpecialRequests, setEditSpecialRequests] = useState("");
  const [editAdminNotes, setEditAdminNotes] = useState("");
  const [editEarlyCheckinFee, setEditEarlyCheckinFee] = useState("");
  const [editLateCheckoutFee, setEditLateCheckoutFee] = useState("");
  const [editRoomUnitId, setEditRoomUnitId] = useState("");
  const [editPromotionId, setEditPromotionId] = useState("");
  const [editDiscountPercent, setEditDiscountPercent] = useState(0);

  // Delete confirmation
  const [delResName, setDelResName] = useState("");
  const [delGuestName, setDelGuestName] = useState("");

  // Edit guest form for CHECK_IN
  const [showGuestFormEdit, setShowGuestFormEdit] = useState(false);

  // Assigned admin profile (for SITE/AI bookings)
  const { data: assignedAdmin } = useBookingAdminProfile(reservation?.assigned_admin_id);

  // Guest form data (for CHECK_IN/CHECK_OUT edit and delete confirmation)
  const { data: guestForm } = useQuery<GuestForm | null>({
    queryKey: QK.guestForm(reservation?.id),
    queryFn: async () => {
      if (!reservation) return null;
      const { data, error } = await supabase
        .from("guest_forms")
        .select("*")
        .eq("reservation_id", reservation.id)
        .maybeSingle();
      if (error) throw error;
      return data as GuestForm | null;
    },
    enabled: !!reservation && (reservation.status === "CHECK_IN" || reservation.status === "CHECK_OUT"),
  });

  // All active room units (for room picker in edit mode)
  const { data: allRoomUnits } = useQuery({
    queryKey: QK.roomUnitsWithType(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_units")
        .select("id, room_number, room_type:room_types(name, name_uk)")
        .eq("is_active", true)
        .order("room_number");
      if (error) throw error;
      return data as Array<{ id: string; room_number: string; room_type: { name: string; name_uk: string | null } | null }>;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Which rooms are already booked for the currently-selected edit dates
  const editCiStr = editCheckIn  ? format(editCheckIn,  "yyyy-MM-dd") : null;
  const editCoStr = editCheckOut ? format(editCheckOut, "yyyy-MM-dd") : null;

  const { data: bookedUnitIds } = useQuery({
    queryKey: QK.bookedUnitsForEdit(reservation?.id, editCiStr!, editCoStr!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("room_unit_id")
        .neq("id", reservation!.id)
        .in("status", ["UNPROCESSED", "PENDING", "CONFIRMED", "CHECK_IN"])
        .lt("check_in_date", editCoStr!)
        .gt("check_out_date", editCiStr!);
      if (error) throw error;
      return new Set((data ?? []).map(r => r.room_unit_id).filter(Boolean) as string[]);
    },
    enabled: !!reservation && !!editCiStr && !!editCoStr,
    staleTime: 0,
  });

  // Promotions list (for picker in edit + display in view)
  const { data: allPromotions } = useQuery({
    queryKey: QK.promotionsForPicker(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("id, title, title_uk, discount_percent, is_active")
        .order("sort_order");
      if (error) throw error;
      return data as Array<{ id: string; title: string; title_uk: string | null; discount_percent: number; is_active: boolean }>;
    },
    staleTime: 5 * 60 * 1000,
    enabled: mode === "edit" || !!reservation?.promotion_id,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const { updateStatusMutation, updateDetailsMutation, deleteMutation } =
    useCalendarBookingMutation({
      onStatusSuccess: () => onClose(),
      onDetailsSuccess: () => setMode("view"),
      onDeleteSuccess: () => onClose(),
    });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function enterEditMode() {
    if (!reservation) return;
    setEditGuestName(reservation.guest_name);
    setEditGuestEmail(reservation.guest_email ?? "");
    setEditGuestPhone(reservation.guest_phone ?? "");
    setEditNumGuests(String(reservation.num_guests));
    setEditCheckIn(parseISO(reservation.check_in_date));
    setEditCheckOut(parseISO(reservation.check_out_date));
    setEditSpecialRequests(reservation.special_requests ?? "");
    setEditAdminNotes(reservation.admin_notes ?? "");
    setEditEarlyCheckinFee(reservation.early_checkin_fee > 0 ? String(reservation.early_checkin_fee) : "");
    setEditLateCheckoutFee(reservation.late_checkout_fee > 0 ? String(reservation.late_checkout_fee) : "");
    setEditRoomUnitId(reservation.room_unit_id ?? "");
    setEditPromotionId(reservation.promotion_id ?? "");
    setEditDiscountPercent(reservation.discount_percent ?? 0);
    setMode("edit");
  }

  function enterDeleteMode() {
    setDelResName("");
    setDelGuestName("");
    setMode("delete-confirm");
  }

  function handleClose() {
    setMode("view");
    setCheckoutConfirm(false);
    onClose();
  }

  const isProtected = reservation?.status === "CHECK_IN" || reservation?.status === "CHECK_OUT";

  const deleteValid = (() => {
    if (!reservation) return false;
    const resNameOk = delResName.trim().toLowerCase() === reservation.guest_name.trim().toLowerCase();
    if (!isProtected) return resNameOk;
    if (!guestForm) return resNameOk;
    return resNameOk && delGuestName.trim().toLowerCase() === guestForm.full_name.trim().toLowerCase();
  })();

  const canEdit = reservation && (
    reservation.status === "UNPROCESSED" ||
    reservation.status === "PENDING" ||
    reservation.status === "CONFIRMED" ||
    reservation.status === "CHECK_IN" ||
    (reservation.status === "CHECK_OUT" && isSuperAdmin)
  );

  if (!reservation) return null;

  const statusLabel = (s: BookingStatus) => {
    switch (s) {
      case "UNPROCESSED": return t("bookings.unprocessed");
      case "CHECK_IN":  return t("bookings.checkInStatus");
      case "CHECK_OUT": return t("bookings.checkOutStatus");
      case "PENDING":   return t("bookings.pending");
      case "CONFIRMED": return t("bookings.confirmed");
      case "DECLINED":  return t("bookings.declined");
      case "CANCELLED": return t("bookings.cancelled");
      default:          return s;
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={!!reservation} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {t("calendar.bookingDetails")}
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusBadgeClass(reservation.status))}>
                {statusLabel(reservation.status)}
              </span>
            </DialogTitle>
            <DialogDescription>{t("calendar.bookingDetailsDesc")}</DialogDescription>
          </DialogHeader>

          {/* ── VIEW mode ─────────────────────────────────────────────────── */}
          {mode === "view" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="min-w-0"><span className="text-muted-foreground">{t("bookings.guestName")}</span><p className="font-medium break-words">{reservation.guest_name}</p></div>
                <div className="min-w-0"><span className="text-muted-foreground">{t("bookings.email")}</span><p className="font-medium break-all">{reservation.guest_email}</p></div>
                <div><span className="text-muted-foreground">{t("bookings.phone")}</span><p className="font-medium">{reservation.guest_phone || t("common.na")}</p></div>
                <div><span className="text-muted-foreground">{t("bookings.guests")}</span><p className="font-medium">{reservation.num_guests}</p></div>
                <div><span className="text-muted-foreground">{t("bookings.checkIn")}</span><p className="font-medium">{format(parseISO(reservation.check_in_date), "dd MMM yyyy", { locale: dateLocale })}</p></div>
                <div><span className="text-muted-foreground">{t("bookings.checkOut")}</span><p className="font-medium">{format(parseISO(reservation.check_out_date), "dd MMM yyyy", { locale: dateLocale })}</p></div>
                <div>
                  <span className="text-muted-foreground">{t("bookings.accommodation")}</span>
                  <p className="font-medium">{hotelConfig.currencySymbol}{Number(reservation.total_price).toLocaleString()}</p>
                </div>
                {(() => {
                  const nights = differenceInDays(parseISO(reservation.check_out_date), parseISO(reservation.check_in_date));
                  const ttRate = hotelSettings?.tourist_tax_rate ?? 41.5;
                  // Freeze TT for CHECK_IN/CHECK_OUT — always use stored value
                  const isFrozen = reservation.status === "CHECK_IN" || reservation.status === "CHECK_OUT";
                  const tt = (isFrozen || reservation.tourist_tax_amount > 0)
                    ? reservation.tourist_tax_amount
                    : ttRate * reservation.num_guests * nights;
                  const earlyFee = Number(reservation.early_checkin_fee ?? 0);
                  const lateFee  = Number(reservation.late_checkout_fee ?? 0);
                  const grandTotal = Number(reservation.total_price) + tt + earlyFee + lateFee;
                  return (
                    <>
                      <div>
                        <span className="text-muted-foreground">{t("bookings.touristTax")}</span>
                        <p className="font-medium">{hotelConfig.currencySymbol}{tt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        {!isFrozen && <p className="text-xs text-muted-foreground">{ttRate} × {reservation.num_guests} × {nights}н.</p>}
                      </div>
                      {earlyFee > 0 && (
                        <div>
                          <span className="text-muted-foreground">{t("bookings.earlyCheckin")}</span>
                          <p className="font-medium">{hotelConfig.currencySymbol}{earlyFee.toLocaleString()}</p>
                        </div>
                      )}
                      {lateFee > 0 && (
                        <div>
                          <span className="text-muted-foreground">{t("bookings.lateCheckout")}</span>
                          <p className="font-medium">{hotelConfig.currencySymbol}{lateFee.toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">{t("bookings.grandTotal")}</span>
                        <p className="font-bold">{hotelConfig.currencySymbol}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </>
                  );
                })()}
                {reservation.assigned_admin_id && reservation.booking_source !== "ADMIN" && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{t("bookings.processedBy")}</span>
                    <p className="font-medium">{assignedAdmin?.full_name ?? "—"}</p>
                  </div>
                )}
                {reservation.deposit_amount != null && (() => {
                  const early2 = Number(reservation.early_checkin_fee ?? 0);
                  const late2  = Number(reservation.late_checkout_fee ?? 0);
                  const accommodationTotal = Number(reservation.total_price) + early2 + late2;
                  const remaining = Math.max(0, accommodationTotal - Number(reservation.deposit_amount));
                  return (
                    <>
                      <div><span className="text-muted-foreground">{t("bookings.depositAmount")}</span><p className="font-medium">{hotelConfig.currencySymbol}{Number(reservation.deposit_amount).toLocaleString()}</p></div>
                      <div><span className="text-muted-foreground">{t("bookings.remainingBalance")}</span><p className="font-medium text-amber-700">{hotelConfig.currencySymbol}{remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground">+ {t("bookings.touristTax")} ({t("bookings.touristTaxOnSite")})</p></div>
                    </>
                  );
                })()}
                {reservation.payment_method && (
                  <div><span className="text-muted-foreground">{t("bookings.paymentMethod")}</span><p className="font-medium capitalize">{reservation.payment_method === "cash" ? t("bookings.paymentCash") : t("bookings.paymentCard")}</p></div>
                )}
                {reservation.promotion_id && (() => {
                  const promo = allPromotions?.find(p => p.id === reservation.promotion_id);
                  if (!promo) return null;
                  return (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">{t("bookings.promotion")}</span>
                      <p className="font-medium flex items-center gap-2">
                        {(language === "uk" && promo.title_uk) ? promo.title_uk : promo.title}
                        {reservation.discount_percent > 0 && (
                          <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                            −{reservation.discount_percent}%
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {reservation.special_requests && (
                <div><Label className="text-muted-foreground">{t("bookings.specialRequests")}</Label><p className="bg-muted rounded-md p-2 text-sm mt-1">{reservation.special_requests}</p></div>
              )}
              {reservation.admin_notes && (
                <div><Label className="text-muted-foreground">{t("bookings.adminNotes")}</Label><p className="bg-muted rounded-md p-2 text-sm mt-1">{reservation.admin_notes}</p></div>
              )}

              {/* Guest form summary for CHECK_IN/CHECK_OUT */}
              {guestForm && (
                <div className="border rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-medium text-foreground">{t("calendar.checkinFormData")}</p>
                  <p className="text-muted-foreground">{t("guestForm.fullName")}: <span className="text-foreground">{guestForm.full_name}</span></p>
                  {guestForm.country_of_residence && <p className="text-muted-foreground">{t("guestForm.country")}: <span className="text-foreground">{guestForm.country_of_residence}</span></p>}
                  {guestForm.ubk_discount_applied && <p className="text-green-600 text-xs font-medium">{t("guestForm.discountApplied")}</p>}
                </div>
              )}

              {/* Action buttons — hidden for viewers */}
              {!isViewer && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={enterEditMode}>
                      <Edit2 className="h-4 w-4 mr-1" /> {t("calendar.editDetails")}
                    </Button>
                  )}

                  {reservation.status === "CHECK_IN" && (
                    <Button size="sm" variant="outline" onClick={() => setShowGuestFormEdit(true)}>
                      <Edit2 className="h-4 w-4 mr-1" /> {t("calendar.editCheckinForm")}
                    </Button>
                  )}

                  {/* UNPROCESSED: Accept → PENDING or Decline */}
                  {reservation.status === "UNPROCESSED" && (
                    <>
                      <Button size="sm"
                        onClick={() => updateStatusMutation.mutate({ reservationId: reservation.id, currentStatus: reservation.status, status: "PENDING" })}
                        disabled={updateStatusMutation.isPending}>
                        <Check className="h-4 w-4 mr-1" /> {t("bookings.accept")}
                      </Button>
                      <Button size="sm" variant="destructive"
                        onClick={() => updateStatusMutation.mutate({ reservationId: reservation.id, currentStatus: reservation.status, status: "DECLINED" })}
                        disabled={updateStatusMutation.isPending}>
                        <X className="h-4 w-4 mr-1" /> {t("bookings.decline")}
                      </Button>
                    </>
                  )}

                  {/* PENDING: Confirm with deposit dialog */}
                  {reservation.status === "PENDING" && (
                    <>
                      <Button size="sm"
                        onClick={() => {
                          const early_ = Number(reservation.early_checkin_fee ?? 0);
                          const late_  = Number(reservation.late_checkout_fee ?? 0);
                          const accommodationTotal_ = Number(reservation.total_price) + early_ + late_;
                          setDepositInput(String(Math.round(accommodationTotal_ * 0.5)));
                          setPaymentMethod("cash");
                          setShowDepositDialog(true);
                        }}
                        disabled={updateStatusMutation.isPending}>
                        <Check className="h-4 w-4 mr-1" /> {t("bookings.confirmBooking")}
                      </Button>
                      <Button size="sm" variant="destructive"
                        onClick={() => updateStatusMutation.mutate({ reservationId: reservation.id, currentStatus: reservation.status, status: "DECLINED" })}
                        disabled={updateStatusMutation.isPending}>
                        <X className="h-4 w-4 mr-1" /> {t("bookings.decline")}
                      </Button>
                    </>
                  )}

                  {reservation.status === "CONFIRMED" && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => setShowCheckinPayment(true)}>
                        <LogIn className="h-4 w-4 mr-1" /> {t("bookings.checkInAction")}
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => updateStatusMutation.mutate({ reservationId: reservation.id, currentStatus: reservation.status, status: "CANCELLED" })}
                        disabled={updateStatusMutation.isPending}>
                        {t("bookings.cancelBooking")}
                      </Button>
                    </>
                  )}

                  {reservation.status === "CHECK_IN" && (
                    checkoutConfirm ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-sm text-muted-foreground">{t("calendar.confirmCheckoutPrompt")}</span>
                        <Button size="sm" className="bg-stone-700 hover:bg-stone-800 text-white"
                          onClick={() => updateStatusMutation.mutate({ reservationId: reservation.id, currentStatus: reservation.status, status: "CHECK_OUT" })}
                          disabled={updateStatusMutation.isPending}>
                          <LogOut className="h-4 w-4 mr-1" /> {t("calendar.confirmCheckout")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCheckoutConfirm(false)}>{t("guestForm.cancel")}</Button>
                      </div>
                    ) : (
                      <Button size="sm" className="bg-stone-700 hover:bg-stone-800 text-white" onClick={() => setCheckoutConfirm(true)}>
                        <LogOut className="h-4 w-4 mr-1" /> {t("calendar.checkOutAction")}
                      </Button>
                    )
                  )}

                  {isSuperAdmin && (
                    <Button size="sm" variant="destructive" className="ml-auto" onClick={enterDeleteMode}>
                      <Trash2 className="h-4 w-4 mr-1" /> {t("calendar.delete")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── EDIT mode ─────────────────────────────────────────────────── */}
          {mode === "edit" && (
            <div className="space-y-4">
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => setMode("view")}
                  title={t("adminRooms.cancel")}
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded-full text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors disabled:opacity-50"
                  onClick={() => {
                    if (!editCheckIn || !editCheckOut) return;
                    updateDetailsMutation.mutate({
                      reservationId: reservation.id,
                      originalRoomUnitId: reservation.room_unit_id ?? "",
                      originalCheckIn: reservation.check_in_date,
                      originalCheckOut: reservation.check_out_date,
                      roomUnitId: editRoomUnitId,
                      guestName: editGuestName,
                      guestEmail: editGuestEmail,
                      guestPhone: editGuestPhone,
                      numGuests: parseInt(editNumGuests),
                      checkIn: editCheckIn,
                      checkOut: editCheckOut,
                      specialRequests: editSpecialRequests,
                      adminNotes: editAdminNotes,
                      earlyCheckinFee: editEarlyCheckinFee,
                      lateCheckoutFee: editLateCheckoutFee,
                      promotionId: editPromotionId,
                      discountPercent: editDiscountPercent,
                    });
                  }}
                  disabled={updateDetailsMutation.isPending}
                  title={t("calendar.saveChanges")}
                >
                  {updateDetailsMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Check className="h-4 w-4" />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>{t("bookings.guestName")}</Label>
                  <Input value={editGuestName} onChange={e => setEditGuestName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("bookings.email")}</Label>
                  <Input type="email" value={editGuestEmail} onChange={e => setEditGuestEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("bookings.phone")}</Label>
                  <Input value={editGuestPhone} onChange={e => setEditGuestPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("manualBooking.checkInDate")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !editCheckIn && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editCheckIn ? format(editCheckIn, "dd MMM yyyy", { locale: dateLocale }) : t("manualBooking.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={editCheckIn} onSelect={setEditCheckIn} locale={dateLocale} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("manualBooking.checkOutDate")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !editCheckOut && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editCheckOut ? format(editCheckOut, "dd MMM yyyy", { locale: dateLocale }) : t("manualBooking.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={editCheckOut}
                        onSelect={setEditCheckOut}
                        disabled={(d) => !editCheckIn || d <= editCheckIn}
                        locale={dateLocale} />
                    </PopoverContent>
                  </Popover>
                </div>
                {/* Room unit selector */}
                <div className="col-span-2 space-y-1.5">
                  <Label>{t("manualBooking.roomUnit")}</Label>
                  <Select value={editRoomUnitId} onValueChange={setEditRoomUnitId}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "uk" ? "Оберіть номер…" : "Select room…"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(allRoomUnits ?? []).map(unit => {
                        const isCurrent   = unit.id === reservation.room_unit_id;
                        const isOccupied  = (bookedUnitIds ?? new Set()).has(unit.id);
                        const typeName    = language === "uk"
                          ? (unit.room_type?.name_uk || unit.room_type?.name || "")
                          : (unit.room_type?.name || "");
                        return (
                          <SelectItem
                            key={unit.id}
                            value={unit.id}
                            disabled={isOccupied && !isCurrent}
                          >
                            <span className="flex items-center gap-2">
                              <span>{unit.room_number}</span>
                              {typeName && <span className="text-muted-foreground text-xs">{typeName}</span>}
                              {isCurrent && (
                                <span className="text-xs text-primary font-medium">
                                  {language === "uk" ? "(поточний)" : "(current)"}
                                </span>
                              )}
                              {isOccupied && !isCurrent && (
                                <span className="text-xs text-destructive">
                                  {language === "uk" ? "(зайнятий)" : "(occupied)"}
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {bookedUnitIds !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {language === "uk"
                        ? `${(allRoomUnits ?? []).filter(u => !(bookedUnitIds.has(u.id))).length} вільних для обраних дат`
                        : `${(allRoomUnits ?? []).filter(u => !(bookedUnitIds.has(u.id))).length} free for selected dates`}
                    </p>
                  )}
                </div>

                {/* Promotion selector */}
                <div className="col-span-2 space-y-1.5">
                  <Label>{t("manualBooking.promotion")}</Label>
                  <Select
                    value={editPromotionId || "none"}
                    onValueChange={v => {
                      if (v === "none") {
                        setEditPromotionId("");
                        setEditDiscountPercent(0);
                      } else {
                        const promo = allPromotions?.find(p => p.id === v);
                        setEditPromotionId(v);
                        setEditDiscountPercent(promo?.discount_percent ?? 0);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("manualBooking.noPromotion")}</SelectItem>
                      {(allPromotions ?? []).map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {(language === "uk" && p.title_uk) ? p.title_uk : p.title}
                          {p.discount_percent > 0 && ` (−${p.discount_percent}%)`}
                          {!p.is_active && ` [${language === "uk" ? "неактивна" : "inactive"}]`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editDiscountPercent > 0 && (
                    <p className="text-xs text-amber-700">
                      {language === "uk"
                        ? `Знижка ${editDiscountPercent}% на проживання. Ціна бронювання не перераховується автоматично.`
                        : `${editDiscountPercent}% discount on accommodation. Booking price is not automatically recalculated.`}
                    </p>
                  )}
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>{t("bookings.specialRequests")}</Label>
                  <Textarea rows={2} value={editSpecialRequests} onChange={e => setEditSpecialRequests(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>{t("bookings.adminNotes")}</Label>
                  <Textarea rows={2} value={editAdminNotes} onChange={e => setEditAdminNotes(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("bookings.earlyCheckin")} (UAH)</Label>
                  <Input type="number" min="0" step="50" placeholder="0"
                    value={editEarlyCheckinFee} onChange={e => setEditEarlyCheckinFee(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t("bookings.earlyCheckinDesc")}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("bookings.lateCheckout")} (UAH)</Label>
                  <Input type="number" min="0" step="50" placeholder="0"
                    value={editLateCheckoutFee} onChange={e => setEditLateCheckoutFee(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t("bookings.lateCheckoutDesc")}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── DELETE CONFIRM mode ────────────────────────────────────────── */}
          {mode === "delete-confirm" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("bookings.deleteCheckinDesc")}</p>
              <div className="space-y-1.5">
                <Label>{t("bookings.enterReservationName")}</Label>
                <p className="text-xs text-muted-foreground">
                  ({t("bookings.mustMatch")}: <strong>{reservation.guest_name}</strong>)
                </p>
                <Input value={delResName} onChange={e => setDelResName(e.target.value)} />
              </div>
              {isProtected && guestForm && (
                <div className="space-y-1.5">
                  <Label>{t("bookings.enterGuestName")}</Label>
                  <p className="text-xs text-muted-foreground">
                    ({t("bookings.mustMatch")}: <strong>{guestForm.full_name}</strong>)
                  </p>
                  <Input value={delGuestName} onChange={e => setDelGuestName(e.target.value)} />
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setMode("view")}>{t("guestForm.cancel")}</Button>
                <Button variant="destructive" disabled={!deleteValid || deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ reservationId: reservation.id })}>
                  <Trash2 className="h-4 w-4 mr-1" /> {t("bookings.confirmDelete")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Check-in payment dialog (CONFIRMED → Check-in flow) */}
      {showCheckinPayment && (
        <CheckInPaymentDialog
          open={showCheckinPayment}
          onOpenChange={setShowCheckinPayment}
          reservation={reservation}
          onConfirm={() => { onOpenCheckin(reservation); handleClose(); }}
        />
      )}

      {/* Guest form edit dialog for CHECK_IN reservations */}
      {showGuestFormEdit && reservation.status === "CHECK_IN" && (
        <GuestFormDialog
          open={showGuestFormEdit}
          onOpenChange={setShowGuestFormEdit}
          reservation={reservation}
          existingForm={guestForm}
        />
      )}

      {/* Deposit confirmation dialog (PENDING → CONFIRMED) */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("bookings.confirmBooking")}</DialogTitle>
            <DialogDescription>{t("bookings.depositHalf")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("bookings.depositAmount")} ({hotelConfig.currencySymbol})</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={depositInput}
                onChange={(e) => setDepositInput(e.target.value)}
              />
              {depositInput && !isNaN(Number(depositInput)) && (() => {
                const nights_ = differenceInDays(parseISO(reservation.check_out_date), parseISO(reservation.check_in_date));
                const ttRate_ = hotelSettings?.tourist_tax_rate ?? 41.5;
                const tt_ = reservation.tourist_tax_amount > 0 ? reservation.tourist_tax_amount : ttRate_ * reservation.num_guests * nights_;
                const early_ = Number(reservation.early_checkin_fee ?? 0);
                const late_  = Number(reservation.late_checkout_fee ?? 0);
                const accommodationTotal_ = Number(reservation.total_price) + early_ + late_;
                return (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{t("bookings.remainingBalance")}: {hotelConfig.currencySymbol}{Math.max(0, accommodationTotal_ - Number(depositInput)).toLocaleString()}</p>
                    <p>+ {t("bookings.touristTax")}: {hotelConfig.currencySymbol}{tt_.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({t("bookings.touristTaxOnSite")})</p>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-1.5">
              <Label>{t("bookings.paymentMethod")}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("bookings.paymentCash")}</SelectItem>
                  <SelectItem value="card">{t("bookings.paymentCard")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDepositDialog(false)}>
              {t("guestForm.cancel")}
            </Button>
            <Button
              disabled={!depositInput || isNaN(Number(depositInput)) || !paymentMethod || updateStatusMutation.isPending}
              onClick={() => {
                updateStatusMutation.mutate({
                  reservationId: reservation.id,
                  currentStatus: reservation.status,
                  status: "CONFIRMED",
                  depositAmount: Number(depositInput),
                  paymentMethod,
                });
                setShowDepositDialog(false);
              }}
            >
              <Check className="h-4 w-4 mr-1" /> {t("bookings.confirmBooking")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
