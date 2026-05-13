import { addDays, format } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { CalendarIcon, Check, Loader2, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hotelConfig } from "@/config/hotel";
import { useLanguage } from "@/i18n/LanguageContext";
import { formatUkrPhone } from "@/lib/phone-utils";
import { getEffectivePrice } from "@/lib/room-pricing";
import { cn } from "@/lib/utils";
import type { RoomType } from "@/lib/supabase-types";
import type { RoomBookingForm } from "@/hooks/useRoomBookingForm";

interface HotelSettings {
  phone?: string | null;
  email?: string | null;
}

interface Props {
  room: RoomType;
  form: RoomBookingForm;
  hotelSettings: HotelSettings | null | undefined;
}

export function BookingFormPanel({ room, form, hotelSettings }: Props) {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;

  const {
    checkIn, setCheckIn,
    checkOut, setCheckOut,
    rooms, setRooms,
    guestName, setGuestName,
    guestEmail, setGuestEmail,
    guestPhone, setGuestPhone,
    specialRequests, setSpecialRequests,
    isSubmitting,
    nights, minPrice, totalPrice,
    enoughAvailable, noRoomsAtAll, notEnoughRooms, nextRoomId,
    availableUnits, isCheckingAvailability,
    guestPrices,
    handleSubmit,
  } = form;

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="font-serif">{t("roomDetails.bookRoom")}</CardTitle>
        <p className="text-2xl font-bold text-primary">
          {hotelConfig.currencySymbol}{minPrice.toLocaleString()}
          <span className="text-sm font-normal text-muted-foreground">{t("featured.perNight")}</span>
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("roomDetails.checkIn")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkIn ? format(checkIn, "dd MMM", { locale: dateLocale }) : t("roomDetails.select")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={(date) => {
                      setCheckIn(date);
                      if (date && (!checkOut || checkOut <= date)) {
                        setCheckOut(addDays(date, 1));
                      }
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    locale={dateLocale}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t("roomDetails.checkOut")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOut ? format(checkOut, "dd MMM", { locale: dateLocale }) : t("roomDetails.select")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={(date) => {
                      const baseline = checkIn || new Date();
                      const baselineMidnight = new Date(baseline);
                      baselineMidnight.setHours(0, 0, 0, 0);
                      return date <= baselineMidnight;
                    }}
                    locale={dateLocale}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {checkIn && checkOut && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              isCheckingAvailability
                ? "bg-muted text-muted-foreground"
                : noRoomsAtAll
                  ? "bg-destructive/10 text-destructive"
                  : notEnoughRooms
                    ? "bg-accent text-accent-foreground border border-border"
                    : "bg-accent text-accent-foreground"
            )}>
              {isCheckingAvailability ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("roomDetails.checking")}
                </span>
              ) : noRoomsAtAll ? (
                <div className="space-y-2">
                  <p className="font-medium">{t("roomDetails.notAvailable")}</p>
                  <p className="text-xs">{t("roomDetails.contactManager")}</p>
                  {hotelSettings?.phone && (
                    <a href={`tel:${hotelSettings.phone}`} className="flex items-center gap-1.5 text-xs font-medium hover:underline">
                      <Phone className="h-3.5 w-3.5" />{hotelSettings.phone}
                    </a>
                  )}
                  {hotelSettings?.email && (
                    <a href={`mailto:${hotelSettings.email}`} className="flex items-center gap-1.5 text-xs font-medium hover:underline">
                      <Mail className="h-3.5 w-3.5" />{hotelSettings.email}
                    </a>
                  )}
                </div>
              ) : notEnoughRooms ? (
                <div className="space-y-1.5">
                  <p className="font-medium">{t("roomDetails.notEnoughRooms")}</p>
                  <p className="text-xs">{t("roomDetails.contactManager")}</p>
                  {hotelSettings?.phone && (
                    <a href={`tel:${hotelSettings.phone}`} className="flex items-center gap-1.5 text-xs font-medium hover:underline">
                      <Phone className="h-3.5 w-3.5" />{hotelSettings.phone}
                    </a>
                  )}
                  {hotelSettings?.email && (
                    <a href={`mailto:${hotelSettings.email}`} className="flex items-center gap-1.5 text-xs font-medium hover:underline">
                      <Mail className="h-3.5 w-3.5" />{hotelSettings.email}
                    </a>
                  )}
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {t("roomDetails.available")} ({availableUnits!.length} {t("roomDetails.roomsLeft")})
                </span>
              )}
            </div>
          )}

          <div className="space-y-2">
            {rooms.map((r, idx) => (
              <div key={r.id} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">
                  {t("roomDetails.roomN").replace("{n}", String(idx + 1))}
                </span>
                <Select
                  value={String(r.guests)}
                  onValueChange={val =>
                    setRooms(prev => prev.map(x => x.id === r.id ? { ...x, guests: parseInt(val) } : x))
                  }
                >
                  <SelectTrigger className="h-8 text-sm flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: room.max_guests }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1} {i === 0 ? t("roomDetails.guest") : t("featured.guests")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rooms.length > 1 && (
                  <button
                    type="button"
                    title={t("roomDetails.removeRoom")}
                    className="text-destructive hover:text-destructive/70 shrink-0"
                    onClick={() => setRooms(prev => prev.filter(x => x.id !== r.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium py-1"
              onClick={() => setRooms(prev => [...prev, { id: nextRoomId, guests: 1 }])}
            >
              <Plus className="h-4 w-4" />
              {t("roomDetails.addRoom")}
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestName">{t("roomDetails.fullName")} *</Label>
            <Input id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="John Doe" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestPhone">{t("roomDetails.phone")} *</Label>
            <Input
              id="guestPhone"
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(formatUkrPhone(e.target.value))}
              placeholder="+380 XX XXX XX XX"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestEmail">{t("roomDetails.email")}</Label>
            <Input id="guestEmail" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="john@example.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequests">{t("roomDetails.specialRequests")}</Label>
            <Textarea id="specialRequests" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder={t("roomDetails.specialRequestsPlaceholder")} rows={3} />
          </div>

          {nights > 0 && (
            <div className="border-t border-border pt-4 space-y-1.5">
              {rooms.map((r, idx) => {
                const rPrice = getEffectivePrice(guestPrices ?? [], r.guests, room.base_price) * nights;
                return (
                  <div key={r.id} className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("roomDetails.roomN").replace("{n}", String(idx + 1))} · {r.guests} {r.guests === 1 ? t("roomDetails.guest") : t("featured.guests")} × {nights} {nights > 1 ? t("roomDetails.nights") : t("roomDetails.night")}</span>
                    <span>{hotelConfig.currencySymbol}{rPrice.toLocaleString()}</span>
                  </div>
                );
              })}
              <div className="flex justify-between font-bold text-lg pt-1 border-t border-border">
                <span>{t("roomDetails.total")}</span>
                <span className="text-primary">{hotelConfig.currencySymbol}{totalPrice.toLocaleString()}</span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting || !checkIn || !checkOut || !enoughAvailable || isCheckingAvailability}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("roomDetails.submitting")}
              </>
            ) : (
              t("roomDetails.requestBooking")
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t("roomDetails.confirmViaEmail")}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
