import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { format, differenceInDays, addDays } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon, Users, Maximize, Bed, Check, ArrowLeft, Loader2, Trash2, Plus, Phone, Mail } from "lucide-react";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { RoomPhotoCarousel } from "@/components/RoomPhotoCarousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRoomType } from "@/hooks/useRoomTypes";
import { useLocalizedRoom } from "@/hooks/useLocalizedRoom";
import { useAvailability } from "@/hooks/useAvailability";
import { hotelConfig } from "@/config/hotel";
import { supabase } from "@/integrations/supabase/client";
import { getConflictingRooms } from "@/lib/booking-conflicts";
import { QK } from "@/lib/queryKeys";
import { getEffectivePrice, getMinPrice } from "@/lib/room-pricing";
import type { RoomTypeGuestPrice } from "@/lib/supabase-types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { FadeIn } from "@/components/ui/FadeIn";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useLocalizedRooms } from "@/hooks/useLocalizedRoom";

// Room images mapping
import roomDeluxe from "@/assets/room-deluxe.jpg";
import roomExecutive from "@/assets/room-executive.jpg";
import roomPresidential from "@/assets/room-presidential.jpg";
import roomFamily from "@/assets/room-family.jpg";

const roomImages: Record<string, string> = {
  "standard-room": roomDeluxe,
  "deluxe-room": roomDeluxe,
  "executive-suite": roomExecutive,
  "presidential-suite": roomPresidential,
  "family-room": roomFamily,
};

// Accept only yyyy-MM-dd strings that produce a real calendar date.
function parseSafeDate(raw: string | null): Date | undefined {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d;
}

// Accept only positive integers in the range 1–99.
function parseSafeAdults(raw: string | null): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 && n <= 99 ? n : 1;
}

export default function RoomDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { data: rawRoom, isLoading } = useRoomType(slug || "");
  const room = useLocalizedRoom(rawRoom);

  // Pre-fill from URL params when coming from hero search
  const urlCheckIn  = urlParams.get("checkIn");
  const urlCheckOut = urlParams.get("checkOut");
  const urlAdults   = urlParams.get("adults");

  const { data: hotelSettings, checkInTime } = useHotelSettings();

  // Booking form state
  const [checkIn, setCheckIn] = useState<Date>(() => parseSafeDate(urlCheckIn));
  const [checkOut, setCheckOut] = useState<Date>(() => parseSafeDate(urlCheckOut));
  type RoomEntry = { id: number; guests: number };
  const [rooms, setRooms] = useState<RoomEntry[]>([{ id: 1, guests: parseSafeAdults(urlAdults) }]);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("+380 ");
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  let nextRoomId = rooms.length ? Math.max(...rooms.map(r => r.id)) + 1 : 1;
  
  const { data: availableUnits, isLoading: isCheckingAvailability } = useAvailability(
    room?.id,
    checkIn,
    checkOut
  );
  
  const { data: guestPrices } = useQuery({
    queryKey: QK.roomTypeGuestPrices(room?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_type_guest_prices").select("*")
        .eq("room_type_id", room!.id).order("guest_count");
      if (error) throw error;
      return data as RoomTypeGuestPrice[];
    },
    enabled: !!room?.id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: rawAllRooms } = useRoomTypes();
  const allRooms = useLocalizedRooms(rawAllRooms);
  const similarRooms = allRooms?.filter(r => r.slug !== slug).slice(0, 3) ?? [];

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const minPrice = room ? getMinPrice(guestPrices ?? [], room.base_price) : 0;
  const totalPrice = room
    ? rooms.reduce((sum, r) => sum + getEffectivePrice(guestPrices ?? [], r.guests, room.base_price) * nights, 0)
    : 0;
  const enoughAvailable = !!(availableUnits && availableUnits.length >= rooms.length);
  const noRoomsAtAll = !isCheckingAvailability && !!(checkIn && checkOut) && availableUnits?.length === 0;
  const notEnoughRooms = !isCheckingAvailability && !!(checkIn && checkOut) && !!availableUnits?.length && availableUnits.length < rooms.length;
  
  useEffect(() => {
    if (window.location.hash === "#booking") {
      const id = setTimeout(() => {
        document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
      }, 500);
      return () => clearTimeout(id);
    }
  }, []);
  
  function formatUkrPhone(raw: string): string {
    // Keep +380 prefix, allow user to type 9 digits after it
    const digits = raw.replace(/^\+380\s*/, "").replace(/\D/g, "").slice(0, 9);
    if (digits.length === 0) return "+380 ";
    if (digits.length <= 2) return `+380 ${digits}`;
    if (digits.length <= 5) return `+380 ${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `+380 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `+380 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!room || !checkIn || !checkOut || !availableUnits?.length) {
      toast({ title: t("common.error"), description: t("roomDetails.errorDates"), variant: "destructive" });
      return;
    }
    if (!enoughAvailable) {
      toast({ title: t("common.error"), description: t("roomDetails.notEnoughRooms"), variant: "destructive" });
      return;
    }
    if (!guestName || !guestPhone) {
      toast({ title: t("common.error"), description: t("roomDetails.errorFields"), variant: "destructive" });
      return;
    }
    const digitsAfterCode = guestPhone.replace(/^\+380\s*/, "").replace(/\D/g, "");
    if (digitsAfterCode.length !== 9) {
      toast({ title: t("common.error"), description: t("roomDetails.errorPhone"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const ciStr = format(checkIn, "yyyy-MM-dd");
      const coStr = format(checkOut, "yyyy-MM-dd");
      const unitIds = availableUnits.slice(0, rooms.length).map(u => u.id);
      const conflicts = await getConflictingRooms(unitIds, ciStr, coStr);
      if (conflicts.length > 0) {
        toast({ title: t("common.error"), description: t("common.roomUnavailable"), variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      for (let i = 0; i < rooms.length; i++) {
        const roomPrice = getEffectivePrice(guestPrices ?? [], rooms[i].guests, room.base_price) * nights;
        const { error } = await supabase.from("reservations").insert({
          room_unit_id: unitIds[i],
          guest_name: guestName,
          guest_email: guestEmail.trim() || "",
          guest_phone: guestPhone.trim(),
          check_in_date: ciStr,
          check_out_date: coStr,
          num_guests: rooms[i].guests,
          total_price: roomPrice,
          special_requests: specialRequests || null,
          status: "UNPROCESSED",
        });
        if (error) throw error;
      }
      toast({ title: t("booking.submitted"), description: t("booking.received") });
      navigate(`/booking-confirmation?room=${room.name}&checkIn=${ciStr}&checkOut=${coStr}&total=${totalPrice}`);
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({ title: t("roomDetails.bookingFailed"), description: t("roomDetails.tryAgain"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-[400px] w-full rounded-lg mb-8" />
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }
  
  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t("roomDetails.roomNotFound")}</h1>
          <Button asChild>
            <Link to="/rooms">{t("roomDetails.viewAllRooms")}</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/rooms">
            <ArrowLeft className="h-4 w-4" />
            {t("roomDetails.back")}
          </Link>
        </Button>
      </div>
      
      {/* Hero Image */}
      <section className="relative h-[50vh] min-h-[400px]">
        <RoomPhotoCarousel
          roomTypeId={room.id}
          fallbackSrc={roomImages[room.slug] || room.image_url || roomDeluxe}
          alt={room.name}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
                {room.name}
              </h1>
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t("featured.upTo")} {room.max_guests} {t("featured.guests")}
                </span>
                {room.size_sqm && (
                  <span className="flex items-center gap-2">
                    <Maximize className="h-4 w-4" />
                    {room.size_sqm} m²
                  </span>
                )}
                {room.bed_type && (
                  <span className="flex items-center gap-2">
                    <Bed className="h-4 w-4" />
                    {room.bed_type}
                  </span>
                )}
              </div>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm text-muted-foreground">{t("roomDetails.from")}</p>
              <p className="text-2xl font-bold text-primary">
                {hotelConfig.currencySymbol}{minPrice.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">{t("featured.perNight")}</span>
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Room Details */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-serif text-2xl font-bold text-foreground mb-4">{t("roomDetails.aboutRoom")}</h2>
                <p className="text-muted-foreground leading-relaxed">{room.description}</p>
              </div>
              
              {room.amenities && room.amenities.length > 0 && (
                <div>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">{t("roomDetails.amenities")}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {room.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h2 className="font-serif text-2xl font-bold text-foreground mb-4">{t("roomDetails.policies")}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="font-medium text-foreground">{t("roomDetails.checkIn")}</p>
                      <p className="text-muted-foreground">{t("roomDetails.from")} {checkInTime}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="font-medium text-foreground">{t("roomDetails.checkOut")}</p>
                      <p className="text-muted-foreground">{hotelConfig.checkOutTime}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
            
            {/* Booking Form */}
            <div id="booking">
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
                    
                    {/* Availability status */}
                    {checkIn && checkOut && (
                      <div className={cn(
                        "p-3 rounded-lg text-sm",
                        isCheckingAvailability
                          ? "bg-muted text-muted-foreground"
                          : noRoomsAtAll
                            ? "bg-destructive/10 text-destructive"
                            : notEnoughRooms
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
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

                    {/* Multi-room selector */}
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
                        onClick={() => setRooms(prev => [...prev, { id: nextRoomId++, guests: 1 }])}
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
            </div>
          </div>
        </div>
      </section>

      {/* Similar Rooms */}
      {similarRooms.length > 0 && (
        <section className="py-12 md:py-16 bg-card border-t border-border">
          <div className="container mx-auto px-4">
            <FadeIn>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-8">
                {t("roomDetails.similarRooms")}
              </h2>
            </FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarRooms.map((r, i) => (
                <FadeIn key={r.id} delay={i * 100}>
                  <div className="group rounded-xl overflow-hidden border border-border bg-background hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={r.image_url || roomImages[r.slug] || roomDeluxe}
                        alt={r.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-medium">
                        {t("featured.from")} {hotelConfig.currencySymbol}{r.base_price}{t("featured.perNight")}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{r.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{r.short_description || r.description}</p>
                      <Button asChild size="sm" className="w-full">
                        <Link to={`/rooms/${r.slug}`}>{t("featured.viewDetails")}</Link>
                      </Button>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
