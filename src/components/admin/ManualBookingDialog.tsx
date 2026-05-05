import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, addDays } from "date-fns";
import { getEffectivePrice } from "@/lib/room-pricing";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { CalendarIcon, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { hotelConfig } from "@/config/hotel";
import { cn } from "@/lib/utils";
import { QK } from "@/lib/queryKeys";
import type { RoomType, RoomUnit, RoomTypeGuestPrice, BookingStatus } from "@/lib/supabase-types";
import { useLanguage } from "@/i18n/LanguageContext";
import { useManualBookingMutation } from "@/hooks/useManualBookingMutation";

interface ManualBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRoomUnitId?: string;
  initialRoomTypeId?: string;
  initialCheckIn?: Date;
  initialCheckOut?: Date;
}

export function ManualBookingDialog({ open, onOpenChange, initialRoomUnitId, initialRoomTypeId, initialCheckIn, initialCheckOut }: ManualBookingDialogProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { data: hotelSettings } = useHotelSettings();
  
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [numGuests, setNumGuests] = useState("1");
  const [selectedRoomType, setSelectedRoomType] = useState<string>("");
  const [selectedRoomUnit, setSelectedRoomUnit] = useState<string>("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [status, setStatus] = useState<BookingStatus>("PENDING");
  
  const { data: roomTypes } = useQuery({
    queryKey: QK.roomTypes(),
    queryFn: async () => {
      const { data, error } = await supabase.from("room_types").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data as RoomType[];
    },
  });
  
  const ciStr = checkInDate ? format(checkInDate, "yyyy-MM-dd") : null;
  const coStr = checkOutDate ? format(checkOutDate, "yyyy-MM-dd") : null;

  const { data: roomUnits, isFetching: roomUnitsFetching } = useQuery({
    queryKey: QK.roomUnitsAvailable(selectedRoomType, ciStr, coStr),
    queryFn: async () => {
      if (!selectedRoomType) return [];
      const { data, error } = await supabase
        .from("room_units").select("*")
        .eq("room_type_id", selectedRoomType).eq("is_active", true)
        .order("room_number");
      if (error) throw error;
      const all = data as RoomUnit[];
      if (!ciStr || !coStr) return all;
      const conflicting = new Set(
        await getConflictingRooms(all.map(u => u.id), ciStr, coStr)
      );
      return all.filter(u => !conflicting.has(u.id));
    },
    enabled: !!selectedRoomType,
  });

  const { data: guestPrices } = useQuery({
    queryKey: QK.roomTypeGuestPrices(selectedRoomType),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_type_guest_prices").select("*")
        .eq("room_type_id", selectedRoomType).order("guest_count");
      if (error) throw error;
      return data as RoomTypeGuestPrice[];
    },
    enabled: !!selectedRoomType,
  });

  // Clear selected room unit if it's no longer in the available list
  useEffect(() => {
    if (selectedRoomUnit && roomUnits && !roomUnits.some(u => u.id === selectedRoomUnit)) {
      setSelectedRoomUnit("");
    }
  }, [roomUnits, selectedRoomUnit]);
  
  const selectedRoom = roomTypes?.find(r => r.id === selectedRoomType);
  const nights = checkInDate && checkOutDate ? differenceInDays(checkOutDate, checkInDate) : 0;
  const effectivePricePerNight = selectedRoom
    ? getEffectivePrice(guestPrices ?? [], parseInt(numGuests || "1"), selectedRoom.base_price)
    : 0;
  const totalPrice = effectivePricePerNight * nights;
  const ttRate = hotelSettings?.tourist_tax_rate ?? 41.5;
  const touristTax = ttRate * parseInt(numGuests || "1") * nights;
  const grandTotal = totalPrice + touristTax;
  
  useEffect(() => {
    if (open) {
      setGuestName(""); setGuestEmail(""); setGuestPhone("");
      setCheckInDate(initialCheckIn); setCheckOutDate(initialCheckOut);
      setNumGuests("1"); setSelectedRoomType(initialRoomTypeId || "");
      setSelectedRoomUnit(initialRoomUnitId || ""); setSpecialRequests("");
      setAdminNotes(""); setStatus("PENDING");
    }
  }, [open, initialRoomUnitId, initialRoomTypeId, initialCheckIn, initialCheckOut]);
  
  const { createBookingMutation } = useManualBookingMutation({
    onBookingCreated: () => onOpenChange(false),
  });

  const isValid = guestName && guestPhone && checkInDate && checkOutDate && selectedRoomType && selectedRoomUnit && nights > 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("manualBooking.title")}</DialogTitle>
          <DialogDescription>{t("manualBooking.subtitle")}</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t("manualBooking.guestInfo")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guestName">{t("manualBooking.guestName")} *</Label>
                <Input id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestPhone">{t("manualBooking.phone")}</Label>
                <Input id="guestPhone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+380..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestEmail">{t("manualBooking.email")}</Label>
                <Input id="guestEmail" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numGuests">{t("manualBooking.numGuests")}</Label>
                <Select value={numGuests} onValueChange={setNumGuests}>
                  <SelectTrigger><Users className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: selectedRoom?.max_guests ?? 6 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} {n > 1 ? t("bookings.guests") : t("bookings.guest")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t("manualBooking.stayDates")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("manualBooking.checkInDate")} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal hover:bg-muted hover:text-foreground", !checkInDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkInDate ? format(checkInDate, "PPP", { locale: dateLocale }) : t("manualBooking.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={checkInDate} onSelect={(date) => { setCheckInDate(date); if (date && (!checkOutDate || checkOutDate <= date)) setCheckOutDate(addDays(date, 1)); }} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} locale={dateLocale} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t("manualBooking.checkOutDate")} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal hover:bg-muted hover:text-foreground", !checkOutDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkOutDate ? format(checkOutDate, "PPP", { locale: dateLocale }) : t("manualBooking.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={checkOutDate} onSelect={setCheckOutDate} disabled={(date) => !checkInDate || date <= checkInDate} locale={dateLocale} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {nights > 0 && (
              <p className="text-sm text-muted-foreground">{nights} {nights > 1 ? t("manualBooking.nights") : t("manualBooking.night")}</p>
            )}
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t("manualBooking.roomSelection")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("manualBooking.roomType")} *</Label>
                <Select value={selectedRoomType} onValueChange={(v) => { setSelectedRoomType(v); setSelectedRoomUnit(""); const rt = roomTypes?.find(r => r.id === v); if (rt && parseInt(numGuests) > rt.max_guests) setNumGuests("1"); }}>
                  <SelectTrigger><SelectValue placeholder={t("manualBooking.selectRoomType")} /></SelectTrigger>
                  <SelectContent>
                    {roomTypes?.map((room) => (
                      <SelectItem key={room.id} value={room.id}>{room.name} - {hotelConfig.currencySymbol}{room.base_price}/{t("manualBooking.night")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("manualBooking.roomUnit")} *</Label>
                <Select value={selectedRoomUnit} onValueChange={setSelectedRoomUnit} disabled={!selectedRoomType || roomUnitsFetching}>
                  <SelectTrigger>
                    {roomUnitsFetching
                      ? <span className="flex items-center gap-1 text-muted-foreground text-sm"><Loader2 className="h-3 w-3 animate-spin" />{t("common.loading")}</span>
                      : <SelectValue placeholder={t("manualBooking.selectRoom")} />}
                  </SelectTrigger>
                  <SelectContent>
                    {roomUnits && roomUnits.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">{t("manualBooking.noRoomsAvailable")}</div>
                    )}
                    {roomUnits?.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>{t("manualBooking.room")} {unit.room_number} {unit.floor ? `(${t("manualBooking.floor")} ${unit.floor})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t("manualBooking.bookingDetails")}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("manualBooking.bookingStatus")}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">{t("bookings.pending")}</SelectItem>
                    <SelectItem value="CONFIRMED">{t("bookings.confirmed")}</SelectItem>
                    <SelectItem value="CHECK_IN">{t("bookings.checkInStatus")}</SelectItem>
                    <SelectItem value="CHECK_OUT">{t("bookings.checkOutStatus")}</SelectItem>
                    <SelectItem value="CANCELLED">{t("bookings.cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("manualBooking.specialRequests")}</Label>
                <Textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder={t("manualBooking.specialRequestsPlaceholder")} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>{t("manualBooking.adminNotes")}</Label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder={t("manualBooking.adminNotesPlaceholder")} rows={2} />
              </div>
            </div>
          </div>
          
          {selectedRoom && nights > 0 && (
            <div className="bg-muted p-4 rounded-lg space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("bookings.accommodation")}: {selectedRoom.name} × {nights}н. ({hotelConfig.currencySymbol}{effectivePricePerNight.toLocaleString()}/{t("manualBooking.night")})</span>
                <span className="text-foreground">{hotelConfig.currencySymbol}{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("bookings.touristTax")}: {ttRate} × {numGuests} × {nights}н.</span>
                <span className="text-foreground">{hotelConfig.currencySymbol}{touristTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-1.5 mt-1.5">
                <span className="font-semibold text-foreground">{t("bookings.grandTotal")}</span>
                <span className="font-bold text-lg text-foreground">{hotelConfig.currencySymbol}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("manualBooking.cancel")}</Button>
          <Button
            onClick={() => {
              if (!checkInDate || !checkOutDate || !selectedRoomUnit) return;
              createBookingMutation.mutate({
                guestName, guestEmail, guestPhone,
                checkInDate, checkOutDate,
                numGuests: parseInt(numGuests || "1"),
                roomUnitId: selectedRoomUnit,
                totalPrice, ttRate, status,
                specialRequests, adminNotes,
              });
            }}
            disabled={!isValid || createBookingMutation.isPending}>
            {createBookingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("manualBooking.createBooking")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
