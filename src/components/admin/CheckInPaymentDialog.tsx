import { useState, useEffect } from "react";
import { differenceInDays, parseISO } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hotelConfig } from "@/config/hotel";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Reservation } from "@/lib/supabase-types";

interface CheckInPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation;
  /** When set, shows combined totals for the whole group instead of one room */
  groupReservations?: Reservation[];
  onConfirm: () => void;
}

export function CheckInPaymentDialog({
  open,
  onOpenChange,
  reservation,
  groupReservations,
  onConfirm,
}: CheckInPaymentDialogProps) {
  const { t } = useLanguage();
  const { data: hotelSettings } = useHotelSettings();

  const [surcharge, setSurcharge] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const ttRate = hotelSettings?.tourist_tax_rate ?? 41.5;

  // Use the group list when provided (group check-in), otherwise single reservation
  const reservations = groupReservations && groupReservations.length > 1
    ? groupReservations
    : [reservation];

  const isGroup = reservations.length > 1;

  const accommodation = reservations.reduce((s, r) => s + Number(r.total_price), 0);
  const earlyFee      = reservations.reduce((s, r) => s + Number(r.early_checkin_fee ?? 0), 0);
  const lateFee       = reservations.reduce((s, r) => s + Number(r.late_checkout_fee ?? 0), 0);
  const deposit       = reservations.reduce((s, r) => s + Number(r.deposit_amount ?? 0), 0);
  const touristTax    = reservations.reduce((s, r) => {
    const nights_ = differenceInDays(parseISO(r.check_out_date), parseISO(r.check_in_date));
    return s + (r.tourist_tax_amount > 0
      ? r.tourist_tax_amount
      : ttRate * r.num_guests * nights_);
  }, 0);

  const accommodationBase      = accommodation + earlyFee + lateFee;
  const remainingAccommodation = Math.max(0, accommodationBase - deposit);

  useEffect(() => {
    if (!open) return;
    setSurcharge(String(Math.max(0, remainingAccommodation) + touristTax));
    setPaymentMethod("cash");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reservation.id]);

  const surchargeNum = parseFloat(surcharge) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("bookings.checkInPaymentTitle")}</DialogTitle>
          <DialogDescription>
            {isGroup
              ? `${reservations.length} ${t("bookings.rooms")} · ${t("bookings.checkInPaymentDesc")}`
              : t("bookings.checkInPaymentDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Payment breakdown */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("bookings.accommodation")}</span>
              <span>{hotelConfig.currencySymbol}{accommodation.toLocaleString()}</span>
            </div>
            {earlyFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("bookings.earlyCheckin")}</span>
                <span>{hotelConfig.currencySymbol}{earlyFee.toLocaleString()}</span>
              </div>
            )}
            {lateFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("bookings.lateCheckout")}</span>
                <span>{hotelConfig.currencySymbol}{lateFee.toLocaleString()}</span>
              </div>
            )}
            {deposit > 0 && (
              <div className="flex justify-between text-green-600 border-t pt-1">
                <span>{t("bookings.depositAmount")}</span>
                <span>−{hotelConfig.currencySymbol}{deposit.toLocaleString()}</span>
              </div>
            )}
            <div className={`flex justify-between font-medium ${deposit > 0 ? "" : "border-t pt-1"}`}>
              <span>{t("bookings.remainingBalance")}</span>
              <span>{hotelConfig.currencySymbol}{remainingAccommodation.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground border-t pt-1">
              <span>{t("bookings.touristTax")}</span>
              <span>{hotelConfig.currencySymbol}{touristTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1">
              <span>{t("bookings.grandTotal")}</span>
              <span>{hotelConfig.currencySymbol}{(remainingAccommodation + touristTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Total to collect — pre-filled with remaining + tourist tax */}
          <div className="space-y-1.5">
            <Label>{t("bookings.totalToCollect")}</Label>
            <Input
              type="number"
              min={0}
              step={1}
              placeholder="0"
              value={surcharge}
              onChange={e => setSurcharge(e.target.value)}
            />
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <Label>{t("bookings.paymentMethod")}</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("bookings.paymentCash")}</SelectItem>
                <SelectItem value="card">{t("bookings.paymentCard")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("guestForm.cancel")}
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => { onOpenChange(false); onConfirm(); }}
          >
            {t("bookings.proceedToForm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
