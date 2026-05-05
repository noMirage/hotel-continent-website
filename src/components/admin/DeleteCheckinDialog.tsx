import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGuestFormForDelete } from "@/hooks/useBookingsData";
import type { Reservation } from "@/lib/supabase-types";
import { useLanguage } from "@/i18n/LanguageContext";

interface Props {
  booking: Reservation | null;
  isPending: boolean;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function DeleteCheckinDialog({ booking, isPending, onDelete, onClose }: Props) {
  const { t } = useLanguage();
  const [reservationName, setReservationName] = useState("");
  const [guestName, setGuestName] = useState("");
  const { data: guestForm } = useGuestFormForDelete(booking?.id);

  const isValid = (() => {
    if (!booking) return false;
    const resMatch = reservationName.trim().toLowerCase() === booking.guest_name.trim().toLowerCase();
    if (!guestForm) return resMatch;
    const guestMatch = guestName.trim().toLowerCase() === guestForm.full_name.trim().toLowerCase();
    return resMatch && guestMatch;
  })();

  function handleClose() {
    setReservationName("");
    setGuestName("");
    onClose();
  }

  return (
    <Dialog open={!!booking} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">{t("bookings.deleteCheckin")}</DialogTitle>
          <DialogDescription>{t("bookings.deleteCheckinDesc")}</DialogDescription>
        </DialogHeader>

        {booking && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="del-res-name">{t("bookings.enterReservationName")}</Label>
              <p className="text-xs text-muted-foreground">
                ({t("bookings.mustMatch")}: <span className="font-medium">{booking.guest_name}</span>)
              </p>
              <Input
                id="del-res-name"
                value={reservationName}
                onChange={e => setReservationName(e.target.value)}
                placeholder={booking.guest_name}
              />
            </div>

            {guestForm && (
              <div className="space-y-1.5">
                <Label htmlFor="del-guest-name">{t("bookings.enterGuestName")}</Label>
                <p className="text-xs text-muted-foreground">
                  ({t("bookings.mustMatch")}: <span className="font-medium">{guestForm.full_name}</span>)
                </p>
                <Input
                  id="del-guest-name"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder={guestForm.full_name}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            {t("guestForm.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={!isValid || isPending}
            onClick={() => booking && onDelete(booking.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {t("bookings.confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
