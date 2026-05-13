import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { Users, ArrowRight, Bed, Lightbulb, UsersRound } from "lucide-react";
import { GroupBookingRequestDialog } from "./GroupBookingSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getConflictingRooms } from "@/lib/booking-conflicts";
import { toLocalDateString } from "@/lib/date-utils";
import { BLOCKING_STATUSES } from "@/lib/booking-status";
import { hotelConfig } from "@/config/hotel";
import { getEffectivePrice } from "@/lib/room-pricing";
import type { RoomTypeGuestPrice } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import type { SearchParams, RoomSearchEntry } from "./AvailabilitySearchWidget";
import roomDeluxe from "@/assets/room-deluxe.jpg";
import roomExecutive from "@/assets/room-executive.jpg";

const FALLBACK_IMAGES: Record<string, string> = {
  "deluxe-room": roomDeluxe,
  "standard-room": roomDeluxe,
  "executive-suite": roomExecutive,
};

interface RoomTypeAvailability {
  id: string;
  name: string;
  name_uk: string | null;
  slug: string;
  max_guests: number;
  base_price: number;
  image_url: string | null;
  short_description: string | null;
  short_description_uk: string | null;
  availableCount: number;
}

interface PackageRoom {
  roomType: RoomTypeAvailability;
  guests: number;
}

/** Children aged 5+ occupy a bed and count toward room capacity. */
function effectiveAdults(entry: RoomSearchEntry): number {
  return entry.adults + entry.childrenAges.filter(age => age >= 5).length;
}

/**
 * Greedy allocation: for each search entry, fill using the smallest room type
 * that can fit the remaining guests. Deducts from availableCount as rooms are
 * consumed. Returns null when it is impossible to fulfill the request.
 */
function buildPackage(
  entries: RoomSearchEntry[],
  available: RoomTypeAvailability[],
): PackageRoom[] | null {
  const remaining = new Map(available.map(r => [r.id, r.availableCount]));
  const result: PackageRoom[] = [];

  for (const entry of entries) {
    let left = entry.adults;
    while (left > 0) {
      const candidates = available.filter(r => (remaining.get(r.id) ?? 0) > 0);
      if (!candidates.length) return null;
      const sorted = [...candidates].sort((a, b) => a.max_guests - b.max_guests);
      // Pick smallest type that still fits; fall back to largest
      const fit = sorted.find(rt => rt.max_guests >= left);
      const pick = fit ?? sorted[sorted.length - 1];
      const inRoom = Math.min(left, pick.max_guests);
      result.push({ roomType: pick, guests: inRoom });
      remaining.set(pick.id, (remaining.get(pick.id) ?? 0) - 1);
      left -= inRoom;
    }
  }
  return result;
}

function useAvailabilitySearch(params: SearchParams | null) {
  return useQuery({
    queryKey: QK.heroAvailability(
      params?.checkIn ? toLocalDateString(params.checkIn) : undefined,
      params?.checkOut ? toLocalDateString(params.checkOut) : undefined,
      JSON.stringify(params?.rooms),
    ),
    queryFn: async (): Promise<RoomTypeAvailability[]> => {
      if (!params) return [];
      const ciStr = format(params.checkIn, "yyyy-MM-dd");
      const coStr = format(params.checkOut, "yyyy-MM-dd");

      // 1. Booked unit IDs from regular reservations — UNPROCESSED is also blocking
      //    to prevent offering rooms that already have a pending request
      const { data: booked } = await supabase
        .from("reservations")
        .select("room_unit_id")
        .in("status", BLOCKING_STATUSES as unknown as string[])
        .or(`and(check_in_date.lt.${coStr},check_out_date.gt.${ciStr})`);
      const bookedIds = new Set((booked ?? []).map((r: any) => r.room_unit_id));

      // 2. Also exclude group-booked units
      const { data: groupBooked } = await supabase
        .from("group_booking_room_assignments")
        .select("room_unit_id, group_booking:group_bookings(check_in_date, check_out_date, status)")
        .filter("group_booking.status", "in", '("PENDING","CONFIRMED","CHECK_IN")');
      (groupBooked ?? []).forEach((g: any) => {
        const gb = g.group_booking;
        if (gb && gb.check_in_date < coStr && gb.check_out_date > ciStr) {
          bookedIds.add(g.room_unit_id);
        }
      });

      // 3. All active units with their room type
      const { data: units, error } = await supabase
        .from("room_units")
        .select("id, room_type_id, room_type:room_types(id, name, name_uk, slug, max_guests, base_price, image_url, short_description, short_description_uk)")
        .eq("is_active", true);
      if (error) throw error;

      // 4. Group by room_type, count available units
      const typeMap = new Map<string, RoomTypeAvailability>();
      for (const unit of units ?? []) {
        const rt = (unit as any).room_type;
        if (!rt) continue;
        if (!typeMap.has(rt.id)) {
          typeMap.set(rt.id, { ...rt, availableCount: 0 });
        }
        if (!bookedIds.has(unit.id)) {
          typeMap.get(rt.id)!.availableCount += 1;
        }
      }

      return Array.from(typeMap.values()).filter(r => r.availableCount > 0);
    },
    enabled: !!params,
  });
}

interface Props {
  params: SearchParams;
  onReset: () => void;
}

export function AvailabilityResultsSection({ params, onReset }: Props) {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { data: available = [], isLoading } = useAvailabilitySearch(params);
  const [showPackageModal,   setShowPackageModal]   = useState(false);
  const [showGroupDialog,    setShowGroupDialog]     = useState(false);

  const { data: allGuestPrices = [] } = useQuery({
    queryKey: QK.allRoomTypeGuestPrices(),
    queryFn: async () => {
      const { data, error } = await supabase.from("room_type_guest_prices").select("*");
      if (error) throw error;
      return data as RoomTypeGuestPrice[];
    },
  });

  const nights      = differenceInDays(params.checkOut, params.checkIn);
  // Effective total: children >= 5 occupy a bed and count toward capacity
  const totalAdults = params.rooms.reduce((s, r) => s + effectiveAdults(r), 0);

  const nightsLabel = (n: number) => {
    if (language === "uk") {
      if (n === 1) return t("search.night_one");
      if (n >= 2 && n <= 4) return t("search.night_few");
      return t("search.night_many");
    }
    return n === 1 ? t("search.night_one") : t("search.night_few");
  };

  const maxSingleCap = available.reduce((m, r) => Math.max(m, r.max_guests), 0);
  const multiRoomSearch    = params.rooms.length > 1;
  const guestsExceedSingle = available.length > 0 && params.rooms.some(r => effectiveAdults(r) > maxSingleCap);
  const needsPackage = multiRoomSearch || guestsExceedSingle;

  // Pass effective adult counts into the package builder
  const effectiveEntries = params.rooms.map(r => ({ ...r, adults: effectiveAdults(r) }));
  const pkg: PackageRoom[] | null = needsPackage && available.length > 0
    ? buildPackage(effectiveEntries, available)
    : null;

  const pkgTotal = pkg
    ? pkg.reduce((sum, { roomType, guests }) => {
        const prices = allGuestPrices.filter(p => p.room_type_id === roomType.id);
        return sum + getEffectivePrice(prices, guests, roomType.base_price) * nights;
      }, 0)
    : 0;

  const buildBookingUrl = (slug: string, adults: number) =>
    `/rooms/${slug}?checkIn=${format(params.checkIn, "yyyy-MM-dd")}&checkOut=${format(params.checkOut, "yyyy-MM-dd")}&adults=${adults}`;

  const localName = (r: RoomTypeAvailability) => language === "uk" ? (r.name_uk || r.name) : r.name;
  const localDesc = (r: RoomTypeAvailability) => language === "uk" ? (r.short_description_uk || r.short_description || "") : (r.short_description || "");

  return (
    <section className="py-12 bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t("search.results")}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {format(params.checkIn, "dd MMM yyyy", { locale: dateLocale })} → {format(params.checkOut, "dd MMM yyyy", { locale: dateLocale })}
              {" · "}{nights} {nightsLabel(nights)}
              {" · "}{totalAdults} {t("search.adults").toLowerCase()}
              {params.rooms.length > 1 && ` · ${params.rooms.length} ${language === "uk" ? "номери" : "rooms"}`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>← {t("search.searchBtn")}</Button>
        </div>

        {/* Group booking banner — shown when total guests > 20 */}
        {totalAdults > 20 && (
          <div className="mb-6 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/8 via-primary/5 to-secondary/8 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in fade-in-0 slide-in-from-top-2 duration-400">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <UsersRound className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm">
                  {t("groupRequest.bannerTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("groupRequest.bannerDesc").replace("{n}", String(totalAdults))}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowGroupDialog(true)}
              className="shrink-0 gap-2"
            >
              <UsersRound className="h-4 w-4" />
              {t("groupRequest.bannerBtn")}
            </Button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        )}

        {!isLoading && (
          <>
            {/* Smart package suggestion */}
            {pkg && (
              <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary shrink-0" />
                  <p className="font-semibold text-foreground">
                    {language === "uk" ? "Рекомендований пакет номерів" : "Suggested room package"}
                  </p>
                </div>

                {/* Room list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pkg.map(({ roomType, guests }, idx) => {
                    const prices = allGuestPrices.filter(p => p.room_type_id === roomType.id);
                    const pricePerNight = getEffectivePrice(prices, guests, roomType.base_price);
                    const entryTotal = pricePerNight * nights;
                    return (
                      <div key={idx} className="rounded-xl border border-border/60 p-3 bg-background flex flex-col gap-1.5">
                        <span className="text-xs text-muted-foreground font-medium">
                          {t("roomDetails.roomN").replace("{n}", String(idx + 1))}
                        </span>
                        <p className="text-sm font-semibold text-foreground">{localName(roomType)}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {guests} {t("search.adults").toLowerCase()} · {language === "uk" ? "макс." : "max"} {roomType.max_guests}
                        </p>
                        {nights > 0 && (
                          <p className="text-sm font-bold text-primary">{hotelConfig.currencySymbol}{entryTotal.toLocaleString()}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Package total + book button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-primary/15">
                  {nights > 0 && (
                    <p className="text-base font-bold text-foreground">
                      {language === "uk" ? "Разом:" : "Total:"}{" "}
                      <span className="text-primary">{hotelConfig.currencySymbol}{pkgTotal.toLocaleString()}</span>
                      <span className="text-xs font-normal text-muted-foreground ml-1">/ {nights} {nightsLabel(nights)}</span>
                    </p>
                  )}
                  <Button onClick={() => setShowPackageModal(true)} className="flex items-center gap-2">
                    {t("search.bookPackage")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Individual room cards */}
            {available.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {available.map(room => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    nights={nights}
                    adults={effectiveAdults(params.rooms[0] ?? { adults: 1, children: 0, childrenAges: [], id: 0 })}
                    allGuestPrices={allGuestPrices}
                    buildBookingUrl={buildBookingUrl}
                    localName={localName}
                    localDesc={localDesc}
                    t={t}
                    language={language}
                    nightsLabel={nightsLabel}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 space-y-2">
                <Bed className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground font-medium">{t("search.noRooms")}</p>
                <p className="text-muted-foreground text-sm">{t("search.noRoomsHint")}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Group booking request dialog */}
      <GroupBookingRequestDialog
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
        defaults={{
          checkIn:   params.checkIn,
          checkOut:  params.checkOut,
          numGuests: totalAdults,
        }}
      />

      {/* Book Package modal */}
      {pkg && (
        <BookPackageModal
          pkg={pkg}
          params={params}
          nights={nights}
          allGuestPrices={allGuestPrices}
          pkgTotal={pkgTotal}
          open={showPackageModal}
          onOpenChange={setShowPackageModal}
          t={t}
          language={language}
          localName={localName}
          nightsLabel={nightsLabel}
        />
      )}
    </section>
  );
}

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomCard({
  room, nights, adults, allGuestPrices, buildBookingUrl, localName, localDesc, t, language, nightsLabel,
}: {
  room: RoomTypeAvailability;
  nights: number;
  adults: number;
  allGuestPrices: RoomTypeGuestPrice[];
  buildBookingUrl: (slug: string, adults: number) => string;
  localName: (r: RoomTypeAvailability) => string;
  localDesc: (r: RoomTypeAvailability) => string;
  t: (k: string, r?: Record<string, string>) => string;
  language: string;
  nightsLabel: (n: number) => string;
}) {
  const imgSrc = room.image_url || FALLBACK_IMAGES[room.slug] || roomDeluxe;
  const clampedAdults = Math.min(adults, room.max_guests);
  const prices = allGuestPrices.filter(p => p.room_type_id === room.id);
  const pricePerNight = getEffectivePrice(prices, clampedAdults, room.base_price);
  const totalPrice = pricePerNight * nights;

  return (
    <Card className="overflow-hidden group hover:shadow-xl transition-shadow duration-300 border-border/50">
      <div className="relative h-48 overflow-hidden">
        <img src={imgSrc} alt={localName(room)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent" />
        <div className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
          {t("search.unitsAvailable", { n: String(room.availableCount) })}
        </div>
      </div>
      <CardContent className="p-5 space-y-3">
        <div>
          <h3 className="font-serif font-bold text-lg text-foreground leading-tight">{localName(room)}</h3>
          {localDesc(room) && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{localDesc(room)}</p>}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4 text-primary/60" />
          <span>{t("search.maxGuests", { n: String(room.max_guests) })}</span>
        </div>
        <div className="flex items-end justify-between pt-1 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground">{hotelConfig.currencySymbol}{pricePerNight.toLocaleString()} {t("search.perNight")}</p>
            {nights > 1 && (
              <p className="text-base font-bold text-primary">
                {hotelConfig.currencySymbol}{totalPrice.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">/ {nights} {nightsLabel(nights)}</span>
              </p>
            )}
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link to={buildBookingUrl(room.slug, clampedAdults)}>
              {t("search.bookNow")} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Book Package Modal ───────────────────────────────────────────────────────

function BookPackageModal({
  pkg, params, nights, allGuestPrices, pkgTotal, open, onOpenChange, t, language, localName, nightsLabel,
}: {
  pkg: PackageRoom[];
  params: SearchParams;
  nights: number;
  allGuestPrices: RoomTypeGuestPrice[];
  pkgTotal: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  t: (k: string, r?: Record<string, string>) => string;
  language: string;
  localName: (r: RoomTypeAvailability) => string;
  nightsLabel: (n: number) => string;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("+380 ");
  const [email, setEmail]       = useState("");
  const [requests, setRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function formatUkrPhone(value: string) {
    const digits = value.replace(/^\+380\s*/, "").replace(/\D/g, "").slice(0, 9);
    let out = "+380 ";
    if (digits.length > 0) out += digits.slice(0, 2);
    if (digits.length > 2) out += " " + digits.slice(2, 5);
    if (digits.length > 5) out += " " + digits.slice(5, 7);
    if (digits.length > 7) out += " " + digits.slice(7, 9);
    return out;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({ title: t("common.error") ?? "Error", description: t("roomDetails.errorFields"), variant: "destructive" });
      return;
    }
    const digitsAfterCode = phone.replace(/^\+380\s*/, "").replace(/\D/g, "");
    if (digitsAfterCode.length !== 9) {
      toast({ title: t("common.error") ?? "Error", description: t("roomDetails.errorPhone"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const ciStr = format(params.checkIn, "yyyy-MM-dd");
      const coStr = format(params.checkOut, "yyyy-MM-dd");

      // Re-fetch available units fresh — same status list as the search query
      const { data: booked } = await supabase
        .from("reservations")
        .select("room_unit_id")
        .in("status", BLOCKING_STATUSES as unknown as string[])
        .or(`and(check_in_date.lt.${coStr},check_out_date.gt.${ciStr})`);
      const bookedIds = new Set((booked ?? []).map((r: any) => r.room_unit_id));

      const { data: units } = await supabase
        .from("room_units")
        .select("id, room_type_id")
        .eq("is_active", true);

      const availByType = new Map<string, string[]>();
      for (const u of units ?? []) {
        if (bookedIds.has(u.id)) continue;
        if (!availByType.has(u.room_type_id)) availByType.set(u.room_type_id, []);
        availByType.get(u.room_type_id)!.push(u.id);
      }

      // Assign a unit to each package room
      const assignments: { unitId: string; guests: number; roomType: RoomTypeAvailability }[] = [];
      for (const { roomType, guests } of pkg) {
        const avail = availByType.get(roomType.id) ?? [];
        if (!avail.length) {
          toast({ title: t("common.error") ?? "Error", description: t("search.noRoomsRetry"), variant: "destructive" });
          setSubmitting(false);
          return;
        }
        assignments.push({ unitId: avail.shift()!, guests, roomType });
      }

      // One group ID links all reservations in this package together
      const packageGroupId = crypto.randomUUID();

      // Insert one reservation per package room, with per-room conflict check
      const insertedIds: string[] = [];
      for (const { unitId, guests, roomType } of assignments) {
        const conflicts = await getConflictingRooms([unitId], ciStr, coStr);
        if (conflicts.length > 0) {
          // Roll back any reservations already inserted in this batch
          if (insertedIds.length > 0) {
            await supabase.from("reservations").delete().in("id", insertedIds);
          }
          throw new Error(t("booking.conflictError") || "One or more rooms became unavailable. Please search again.");
        }
        const prices = allGuestPrices.filter(p => p.room_type_id === roomType.id);
        const roomPrice = getEffectivePrice(prices, guests, roomType.base_price) * nights;
        const { data: inserted, error } = await supabase.from("reservations").insert({
          room_unit_id: unitId,
          guest_name: name.trim(),
          guest_email: email.trim() || "",
          guest_phone: phone.trim(),
          check_in_date: ciStr,
          check_out_date: coStr,
          num_guests: guests,
          total_price: roomPrice,
          special_requests: requests.trim() || null,
          status: "UNPROCESSED",
          booking_group_id: packageGroupId,
        }).select("id").single();
        if (error) {
          if (insertedIds.length > 0) {
            await supabase.from("reservations").delete().in("id", insertedIds);
          }
          throw error;
        }
        if (inserted?.id) insertedIds.push(inserted.id);
      }

      const roomNames = pkg.map(p => localName(p.roomType)).join(", ");
      navigate(`/booking-confirmation?room=${encodeURIComponent(roomNames)}&checkIn=${ciStr}&checkOut=${coStr}&total=${pkgTotal}`);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error(err);
      toast({ title: t("roomDetails.bookingFailed"), description: t("roomDetails.tryAgain"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("search.bookPackage")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Package summary */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground mb-2">{t("search.packageSummary")}</p>
            {pkg.map(({ roomType, guests }, idx) => {
              const prices = allGuestPrices.filter(p => p.room_type_id === roomType.id);
              const pricePn = getEffectivePrice(prices, guests, roomType.base_price);
              return (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("roomDetails.roomN").replace("{n}", String(idx + 1))}: {localName(roomType)} ({guests} {t("search.adults").toLowerCase()})
                  </span>
                  <span className="font-medium text-foreground">
                    {hotelConfig.currencySymbol}{(pricePn * nights).toLocaleString()}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 border-t border-border/50 font-bold">
              <span>{t("roomDetails.total")}</span>
              <span className="text-primary">{hotelConfig.currencySymbol}{pkgTotal.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {nights} {nightsLabel(nights)} · {format(params.checkIn, "dd MMM")} – {format(params.checkOut, "dd MMM yyyy")}
            </p>
          </div>

          {/* Guest fields */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-name">{t("roomDetails.fullName")} *</Label>
              <Input
                id="pkg-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={language === "uk" ? "Іванов Іван Іванович" : "John Smith"}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-phone">{t("roomDetails.phone")} *</Label>
              <Input
                id="pkg-phone"
                value={phone}
                onChange={e => setPhone(formatUkrPhone(e.target.value))}
                placeholder="+380 XX XXX XX XX"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-email">{t("roomDetails.email")}</Label>
              <Input
                id="pkg-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-requests">{t("roomDetails.specialRequests")}</Label>
              <Textarea
                id="pkg-requests"
                value={requests}
                onChange={e => setRequests(e.target.value)}
                placeholder={t("roomDetails.specialRequestsPlaceholder")}
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t("roomDetails.submitting") : t("search.bookPackage")}
          </Button>

          <p className="text-center text-xs text-muted-foreground">{t("roomDetails.confirmViaEmail")}</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
