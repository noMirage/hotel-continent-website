import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, addDays, type Locale } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { Loader2, Users, CalendarIcon, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { hotelConfig } from "@/config/hotel";
import type { RoomUnit, BookingStatus } from "@/lib/supabase-types";
import type { GroupCalculation } from "@/lib/supabase-types";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";
import { getConflictingRooms } from "@/lib/booking-conflicts";
import { getEffectivePrice } from "@/lib/room-pricing";
import { QK } from "@/lib/queryKeys";
import { useCalendarGroupMutation } from "@/hooks/useCalendarGroupMutation";
import type { RoomTypeGuestPrice } from "@/lib/supabase-types";

interface SelectedRoomUnit extends RoomUnit {
  room_type?: { name: string; name_uk?: string | null; max_guests?: number };
}

function statusLabel(s: string, t: (k: string) => string): string {
  switch (s) {
    case "UNPROCESSED": return t("bookings.unprocessed");
    case "PENDING":     return t("bookings.pending");
    case "CONFIRMED":   return t("bookings.confirmed");
    case "CHECK_IN":    return t("bookings.checkInStatus");
    case "CHECK_OUT":   return t("bookings.checkOutStatus");
    case "DECLINED":    return t("bookings.declined");
    case "CANCELLED":   return t("bookings.cancelled");
    default:            return s;
  }
}

interface CalendarGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRoomUnits: SelectedRoomUnit[];
  initialCheckIn?: Date;
  initialCheckOut?: Date;
  initialContactPerson?: string;
  initialPhone?: string;
  initialGroupGuests?: string;
  initialBookingName?: string;
  hideGroupTab?: boolean;
  hideStandardTab?: boolean;
  onCreated?: () => void;
}

export function CalendarGroupDialog({
  open,
  onOpenChange,
  selectedRoomUnits,
  initialCheckIn,
  initialCheckOut,
  initialContactPerson,
  initialPhone,
  initialGroupGuests,
  initialBookingName,
  hideGroupTab = false,
  hideStandardTab = false,
  onCreated,
}: CalendarGroupDialogProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { data: hotelSettings } = useHotelSettings();

  const roomCount = selectedRoomUnits.length;
  const [activeTab, setActiveTab] = useState(roomCount > 5 ? "group" : "standard");

  // Total capacity across all selected rooms
  const maxGroupCapacity = selectedRoomUnits.reduce(
    (sum, u) => sum + ((u.room_type as { max_guests?: number })?.max_guests ?? 2), 0
  );

  // ── Standard booking state ──────────────────────────────────────────────────
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [stdCheckIn, setStdCheckIn] = useState<Date | undefined>();
  const [stdCheckOut, setStdCheckOut] = useState<Date | undefined>();
  const [numGuests, setNumGuests] = useState("1");
  const [selectedStdRoomIds, setSelectedStdRoomIds] = useState<string[]>([]);
  const [specialRequests, setSpecialRequests] = useState("");
  const [stdAdminNotes, setStdAdminNotes] = useState("");
  const [stdStatus, setStdStatus] = useState<BookingStatus>("PENDING");
  const [stdPromotionId, setStdPromotionId] = useState("");
  const [stdDiscountPercent, setStdDiscountPercent] = useState(0);

  // ── Group booking state ─────────────────────────────────────────────────────
  const [bookingName, setBookingName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [groupPhone, setGroupPhone] = useState("");
  const [groupGuests, setGroupGuests] = useState("5");
  const [grpGuestsTouched, setGrpGuestsTouched] = useState(false);
  const [grpCheckIn, setGrpCheckIn] = useState<Date | undefined>();
  const [grpCheckOut, setGrpCheckOut] = useState<Date | undefined>();
  const [grpStatus, setGrpStatus] = useState("PENDING");
  const [grpAdminNotes, setGrpAdminNotes] = useState("");
  const [selectedCalcId, setSelectedCalcId] = useState("none");
  const [customPricePerPersonNight, setCustomPricePerPersonNight] = useState("");
  // Room ids selected in the group tab (editable; pre-filled from calendar selection)
  const [grpSelectedRoomIds, setGrpSelectedRoomIds] = useState<string[]>([]);
  const [grpDepositAmount, setGrpDepositAmount] = useState("");

  // Group tab is enabled when 6+ rooms are selected via calendar drag OR via in-form room list
  const groupTabEnabled = roomCount > 5 || selectedStdRoomIds.length > 5 || grpSelectedRoomIds.length > 5;

  // When user switches to group tab, pre-populate its room list from the standard selection
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "group" && selectedStdRoomIds.length > 0) {
      setGrpSelectedRoomIds(selectedStdRoomIds);
    }
  };

  // All rooms for selection lists (both tabs)
  const { data: allRoomUnits } = useQuery({
    queryKey: QK.allRoomUnitsActive(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_units").select("*, room_type:room_types(name, name_uk, base_price, max_guests)")
        .eq("is_active", true).order("room_number");
      if (error) throw error;
      return data as (RoomUnit & { room_type: { name: string; name_uk?: string | null; base_price: number; max_guests: number } })[];
    },
  });

  const stdCiStr = stdCheckIn ? format(stdCheckIn, "yyyy-MM-dd") : null;
  const stdCoStr = stdCheckOut ? format(stdCheckOut, "yyyy-MM-dd") : null;
  const grpCiStr2 = grpCheckIn ? format(grpCheckIn, "yyyy-MM-dd") : null;
  const grpCoStr2 = grpCheckOut ? format(grpCheckOut, "yyyy-MM-dd") : null;

  // Conflicting room IDs for the standard tab dates
  const { data: stdConflicting } = useQuery({
    queryKey: QK.conflictingRooms(stdCiStr, stdCoStr),
    queryFn: async () => {
      if (!stdCiStr || !stdCoStr || !allRoomUnits?.length) return new Set<string>();
      const ids = await getConflictingRooms(allRoomUnits.map(u => u.id), stdCiStr, stdCoStr);
      return new Set(ids);
    },
    enabled: !!stdCiStr && !!stdCoStr && !!allRoomUnits?.length,
  });

  // Conflicting room IDs for the group tab dates
  const { data: grpConflicting } = useQuery({
    queryKey: QK.conflictingRooms(grpCiStr2, grpCoStr2),
    queryFn: async () => {
      if (!grpCiStr2 || !grpCoStr2 || !allRoomUnits?.length) return new Set<string>();
      const ids = await getConflictingRooms(allRoomUnits.map(u => u.id), grpCiStr2, grpCoStr2);
      return new Set(ids);
    },
    enabled: !!grpCiStr2 && !!grpCoStr2 && !!allRoomUnits?.length,
  });

  // Available room lists (occupied rooms excluded)
  const stdAvailableRooms = allRoomUnits?.filter(u => !stdConflicting?.has(u.id)) ?? allRoomUnits ?? [];
  const grpAvailableRooms = allRoomUnits?.filter(u => !grpConflicting?.has(u.id)) ?? allRoomUnits ?? [];

  // Deselect rooms that became unavailable when dates change
  useEffect(() => {
    if (!stdConflicting) return;
    setSelectedStdRoomIds(prev => prev.filter(id => !stdConflicting.has(id)));
  }, [stdConflicting]);

  useEffect(() => {
    if (!grpConflicting) return;
    setGrpSelectedRoomIds(prev => prev.filter(id => !grpConflicting.has(id)));
  }, [grpConflicting]);

  const { data: allGuestPrices } = useQuery({
    queryKey: QK.allRoomTypeGuestPrices(),
    queryFn: async () => {
      const { data, error } = await supabase.from("room_type_guest_prices").select("*");
      if (error) throw error;
      return data as RoomTypeGuestPrice[];
    },
  });

  const { data: calculations } = useQuery({
    queryKey: QK.groupCalculations(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_calculations")
        .select("*, services:group_calculation_services(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GroupCalculation[];
    },
  });

  const { data: activePromotions } = useQuery({
    queryKey: QK.activePromotions(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("id, title, title_uk, discount_percent")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Array<{ id: string; title: string; title_uk: string | null; discount_percent: number }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!open) return;
    const isGroup = selectedRoomUnits.length > 5;
    setActiveTab(hideStandardTab ? "group" : (isGroup ? "group" : "standard"));
    // Reset standard form
    setGuestName(""); setGuestEmail(""); setGuestPhone("");
    setStdCheckIn(initialCheckIn); setStdCheckOut(initialCheckOut);
    setNumGuests("1"); setSpecialRequests(""); setStdAdminNotes(""); setStdStatus("PENDING");
    setStdPromotionId(""); setStdDiscountPercent(0);
    // Pre-check rooms from calendar grid selection
    setSelectedStdRoomIds(selectedRoomUnits.map(u => u.id));
    // Reset group form — pre-fill from request if provided
    setBookingName(initialBookingName ?? "");
    setContactPerson(initialContactPerson ?? "");
    setGroupPhone(initialPhone ?? "");
    const preGuests = initialGroupGuests ?? String(maxGroupCapacity || 5);
    setGroupGuests(preGuests);
    setGrpGuestsTouched(!!initialGroupGuests);
    setGrpCheckIn(initialCheckIn); setGrpCheckOut(initialCheckOut);
    setGrpStatus("PENDING"); setGrpAdminNotes(""); setSelectedCalcId("none"); setCustomPricePerPersonNight("");
    setGrpDepositAmount("");
    setGrpSelectedRoomIds(selectedRoomUnits.map(u => u.id));
  }, [open, initialCheckIn, initialCheckOut, initialContactPerson, initialPhone, initialGroupGuests, initialBookingName, selectedRoomUnits]);

  // Must be declared before the auto-fill effect that reads it
  const grpMaxCapacity = grpSelectedRoomIds.length > 0
    ? (allRoomUnits?.filter(u => grpSelectedRoomIds.includes(u.id)).reduce((sum, u) => sum + (u.room_type?.max_guests ?? 2), 0) || maxGroupCapacity)
    : (maxGroupCapacity || 500);

  // Auto-set groupGuests when grpMaxCapacity resolves (allRoomUnits loaded or rooms changed)
  useEffect(() => {
    if (grpGuestsTouched || grpMaxCapacity <= 0) return;
    setGroupGuests(String(grpMaxCapacity));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grpMaxCapacity]);

  // ── Standard price calc ─────────────────────────────────────────────────────
  const stdSelectedRooms = allRoomUnits?.filter(u => selectedStdRoomIds.includes(u.id)) ?? [];
  const stdMaxGuests = stdSelectedRooms.reduce((sum, u) => sum + (u.room_type?.max_guests ?? 2), 0) || 6;
  const stdNights = stdCheckIn && stdCheckOut ? differenceInDays(stdCheckOut, stdCheckIn) : 0;
  const stdNumGuests = parseInt(numGuests || "1");
  const stdNumRooms = stdSelectedRooms.length || 1;
  const stdRoomPriceBase = stdSelectedRooms.reduce((sum, u, i) => {
    const roomGuests = Math.floor(stdNumGuests / stdNumRooms) + (i < stdNumGuests % stdNumRooms ? 1 : 0);
    const prices = (allGuestPrices ?? []).filter(p => p.room_type_id === u.room_type_id);
    return sum + getEffectivePrice(prices, roomGuests, u.room_type.base_price) * stdNights;
  }, 0);
  const stdDiscountMultiplier = 1 - stdDiscountPercent / 100;
  const stdDiscountAmount = stdRoomPriceBase * (stdDiscountPercent / 100);
  const stdRoomPrice = stdRoomPriceBase * stdDiscountMultiplier;
  const ttRate = hotelSettings?.tourist_tax_rate ?? 41.5;
  const stdTouristTax = ttRate * parseInt(numGuests || "1") * stdNights;
  const stdGrandTotal = stdRoomPrice + stdTouristTax;

  // ── Group price calc ────────────────────────────────────────────────────────
  const grpNights = grpCheckIn && grpCheckOut ? differenceInDays(grpCheckOut, grpCheckIn) : 0;
  const selectedCalc = calculations?.find(c => c.id === selectedCalcId);
  const calcTotal = selectedCalc
    ? selectedCalc.price_per_person_per_night * parseInt(groupGuests || "5") * grpNights
    : 0;
  const customCalcTotal = selectedCalcId === "custom" && customPricePerPersonNight && grpNights > 0
    ? parseFloat(customPricePerPersonNight) * parseInt(groupGuests || "5") * grpNights
    : 0;
  const finalGroupTotal = selectedCalcId === "custom" ? customCalcTotal : calcTotal;

  // ── Mutations ───────────────────────────────────────────────────────────────
  const { createStdMutation, createGroupMutation } = useCalendarGroupMutation({
    onStdSuccess: () => onOpenChange(false),
    onGroupSuccess: () => { onCreated?.(); onOpenChange(false); },
  });

  const stdValid = !!(guestName && guestPhone && stdCheckIn && stdCheckOut && selectedStdRoomIds.length > 0 && stdNights > 0);
  const grpValid = !!(
    bookingName && contactPerson && grpCheckIn && grpCheckOut && grpNights > 0
    && grpSelectedRoomIds.length > 0
    && parseInt(groupGuests) >= 1
    && parseInt(groupGuests) <= grpMaxCapacity
  );

  // Header reflects the currently active tab's live room selection
  const headerRoomIds = activeTab === "group" ? grpSelectedRoomIds : selectedStdRoomIds;
  const headerRooms = allRoomUnits?.filter(u => headerRoomIds.includes(u.id)) ?? [];
  const headerCount = headerRoomIds.length;
  const headerNames = headerRooms.map(u => `${language === "uk" ? "Кімн." : "Rm"} ${u.room_number}`).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {headerCount > 1
              ? `${t("calendar.selectedRooms")}: ${headerCount}`
              : t("manualBooking.title")}
          </DialogTitle>
          <DialogDescription>
            {headerNames || "—"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {!hideGroupTab && !hideStandardTab && (
          <TabsList className="w-full">
            <TabsTrigger value="standard" className="flex-1">{t("calendar.standardBooking")}</TabsTrigger>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex-1">
                  <TabsTrigger value="group" className="w-full" disabled={!groupTabEnabled}>
                    {t("calendar.groupBooking")}
                    {!groupTabEnabled && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">{Math.max(roomCount, selectedStdRoomIds.length)}/6+</Badge>
                    )}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              {!groupTabEnabled && (
                <TooltipContent>{t("calendar.groupTabDisabled")}</TooltipContent>
              )}
            </Tooltip>
          </TabsList>
          )}

          {/* ── Standard Tab ───────────────────────────────────────────────── */}
          <TabsContent value="standard" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("manualBooking.guestName")} *</Label>
                <Input value={guestName} onChange={e => setGuestName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("manualBooking.phone")}</Label>
                <Input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+380..." />
              </div>
              <div className="space-y-1.5">
                <Label>{t("manualBooking.email")}</Label>
                <Input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("manualBooking.numGuests")}</Label>
                <Select value={numGuests} onValueChange={setNumGuests}>
                  <SelectTrigger><Users className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: stdMaxGuests }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DatePicker label={t("manualBooking.checkInDate")} value={stdCheckIn}
                onChange={d => { setStdCheckIn(d); if (d && (!stdCheckOut || stdCheckOut <= d)) setStdCheckOut(addDays(d, 1)); }}
                disableBefore={new Date()} locale={dateLocale} />
              <DatePicker label={t("manualBooking.checkOutDate")} value={stdCheckOut}
                onChange={setStdCheckOut}
                disableBefore={stdCheckIn ? addDays(stdCheckIn, 1) : new Date()} locale={dateLocale} />
            </div>

            <div className="space-y-1.5">
              <Label>
                {t("manualBooking.roomUnit")} *
                {stdMaxGuests > 0 && selectedStdRoomIds.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">(max {stdMaxGuests} {t("manualBooking.guests") ?? "guests"})</span>
                )}
              </Label>
              <div className="border rounded-md overflow-y-auto max-h-48 divide-y">
                {stdAvailableRooms.map(u => {
                  const typeName = language === "uk" ? (u.room_type.name_uk || u.room_type.name) : u.room_type.name;
                  const isChecked = selectedStdRoomIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className={cn("flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors", isChecked && "bg-muted")}
                      onClick={() => setSelectedStdRoomIds(prev => isChecked ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => setSelectedStdRoomIds(prev => isChecked ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                      />
                      <span className="flex-1 text-sm font-medium">{t("manualBooking.room")} {u.room_number}</span>
                      <span className="text-xs text-muted-foreground">{typeName}</span>
                      <span className="text-xs text-muted-foreground">{hotelConfig.currencySymbol}{u.room_type.base_price}/{t("manualBooking.night")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("manualBooking.bookingStatus")}</Label>
                <Select value={stdStatus} onValueChange={v => setStdStatus(v as BookingStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["PENDING", "CONFIRMED", "CHECK_IN", "CHECK_OUT", "CANCELLED"] as BookingStatus[]).map(s => (
                      <SelectItem key={s} value={s}>{statusLabel(s, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("manualBooking.promotion")}</Label>
                <Select
                  value={stdPromotionId || "none"}
                  onValueChange={v => {
                    if (v === "none") {
                      setStdPromotionId("");
                      setStdDiscountPercent(0);
                    } else {
                      const promo = activePromotions?.find(p => p.id === v);
                      setStdPromotionId(v);
                      setStdDiscountPercent(promo?.discount_percent ?? 0);
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("manualBooking.noPromotion")}</SelectItem>
                    {(activePromotions ?? []).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {(language === "uk" && p.title_uk) ? p.title_uk : p.title}
                        {p.discount_percent > 0 && ` (−${p.discount_percent}%)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("manualBooking.adminNotes")}</Label>
              <Textarea value={stdAdminNotes} onChange={e => setStdAdminNotes(e.target.value)} rows={2} />
            </div>

            {stdSelectedRooms.length > 0 && stdNights > 0 && (
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                {stdSelectedRooms.map((u, i) => {
                  const typeName = language === "uk" ? (u.room_type.name_uk || u.room_type.name) : u.room_type.name;
                  const roomGuests = Math.floor(stdNumGuests / stdNumRooms) + (i < stdNumGuests % stdNumRooms ? 1 : 0);
                  const roomGuestPrices = (allGuestPrices ?? []).filter(p => p.room_type_id === u.room_type_id);
                  const roomRate = getEffectivePrice(roomGuestPrices, roomGuests, u.room_type.base_price);
                  return (
                    <div key={u.id} className="flex justify-between">
                      <span className="text-muted-foreground">{t("manualBooking.room")} {u.room_number} ({typeName}) × {stdNights}</span>
                      <span>{hotelConfig.currencySymbol}{(roomRate * stdNights).toLocaleString()}</span>
                    </div>
                  );
                })}
                {stdDiscountPercent > 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground border-t pt-1">
                      <span>{t("bookings.accommodation")}</span>
                      <span>{hotelConfig.currencySymbol}{stdRoomPriceBase.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span>{t("manualBooking.discount")} (−{stdDiscountPercent}%)</span>
                      <span>−{hotelConfig.currencySymbol}{stdDiscountAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>{language === "uk" ? "Проживання зі знижкою" : "Discounted accommodation"}</span>
                      <span>{hotelConfig.currencySymbol}{stdRoomPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </>
                )}
                <div className={`flex justify-between ${stdDiscountPercent === 0 ? "border-t pt-1" : ""} text-muted-foreground`}>
                  <span>{t("bookings.touristTax")}: {ttRate} × {numGuests} × {stdNights}</span>
                  <span>{hotelConfig.currencySymbol}{stdTouristTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>{t("bookings.grandTotal")}</span>
                  <span>{hotelConfig.currencySymbol}{stdGrandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("manualBooking.cancel")}</Button>
              <Button disabled={!stdValid || createStdMutation.isPending} onClick={() => createStdMutation.mutate({
                checkIn: stdCheckIn!, checkOut: stdCheckOut!,
                selectedRooms: stdSelectedRooms, allRoomUnits: allRoomUnits ?? [], allGuestPrices: allGuestPrices ?? [],
                guestName, guestEmail, guestPhone, numGuests: stdNumGuests,
                ttRate, discountMultiplier: stdDiscountMultiplier, discountPercent: stdDiscountPercent,
                promotionId: stdPromotionId || null, status: stdStatus, specialRequests, adminNotes: stdAdminNotes,
              })}>
                {createStdMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("manualBooking.createBooking")}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ── Group Tab ──────────────────────────────────────────────────── */}
          <TabsContent value="group" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>{t("calendar.selectedRooms")}</Label>
              <div className="border rounded-md overflow-y-auto max-h-48 divide-y">
                {grpAvailableRooms.map(u => {
                  const typeName = language === "uk" ? (u.room_type.name_uk || u.room_type.name) : u.room_type.name;
                  const isChecked = grpSelectedRoomIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className={cn("flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors", isChecked && "bg-muted")}
                      onClick={() => setGrpSelectedRoomIds(prev => isChecked ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => setGrpSelectedRoomIds(prev => isChecked ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                      />
                      <span className="flex-1 text-sm font-medium">{t("manualBooking.room")} {u.room_number}</span>
                      <span className="text-xs text-muted-foreground">{typeName}</span>
                      <span className="text-xs text-muted-foreground">{hotelConfig.currencySymbol}{u.room_type.base_price}/{t("manualBooking.night")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>{t("groupBookings.bookingName")} *</Label>
                <Input value={bookingName} onChange={e => setBookingName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("groupBookings.contactPerson")} *</Label>
                <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("groupBookings.phone")}</Label>
                <Input value={groupPhone} onChange={e => setGroupPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("groupBookings.numGuests")} *{" "}
                  <span className="text-xs text-muted-foreground">
                    ({t("groupBookings.numGuestsHint")}{grpMaxCapacity > 0 ? `, max ${grpMaxCapacity}` : ""})
                  </span>
                </Label>
                <Input
                  type="number" min={5} max={grpMaxCapacity || (hotelSettings?.total_capacity ?? 500)}
                  value={groupGuests}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (grpMaxCapacity > 0 && val > grpMaxCapacity) return;
                    setGrpGuestsTouched(true);
                    setGroupGuests(e.target.value);
                  }}
                />
                {grpMaxCapacity > 0 && parseInt(groupGuests) > grpMaxCapacity && (
                  <p className="text-xs text-destructive">
                    {t("groupBookings.maxCapacityHint").replace("{max}", String(grpMaxCapacity))}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DatePicker label={t("groupBookings.checkIn")} value={grpCheckIn}
                onChange={d => { setGrpCheckIn(d); if (d && (!grpCheckOut || grpCheckOut <= d)) setGrpCheckOut(addDays(d, 1)); }}
                disableBefore={new Date()} locale={dateLocale} />
              <DatePicker label={t("groupBookings.checkOut")} value={grpCheckOut}
                onChange={setGrpCheckOut}
                disableBefore={grpCheckIn ? addDays(grpCheckIn, 1) : new Date()} locale={dateLocale} />
            </div>

            <div className="space-y-1.5">
              <Label>{t("groupBookings.status")}</Label>
              <Select value={grpStatus} onValueChange={setGrpStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["PENDING", "CONFIRMED", "CHECK_IN", "CHECK_OUT", "CANCELLED"].map(s => (
                    <SelectItem key={s} value={s}>{statusLabel(s, t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("groupBookings.adminNotes")}</Label>
              <Textarea value={grpAdminNotes} onChange={e => setGrpAdminNotes(e.target.value)} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label>{t("groupBookings.depositAmount")}</Label>
              <Input
                type="number" min={0} step={1}
                value={grpDepositAmount}
                onChange={e => setGrpDepositAmount(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">{t("groupBookings.depositHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label>{t("groupBookings.calculation")}</Label>
              <Select value={selectedCalcId} onValueChange={setSelectedCalcId}>
                <SelectTrigger><SelectValue placeholder={t("groupBookings.selectCalc")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {calculations?.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.price_per_person_per_night} {t("calculations.uahPerPersonNight")})
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">{t("groupBookings.customAmount")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedCalcId === "custom" && (
              <div className="space-y-1.5">
                <Label>{t("groupBookings.pricePerPersonNight")}</Label>
                <Input type="number" min={0} step={0.01} value={customPricePerPersonNight} onChange={e => setCustomPricePerPersonNight(e.target.value)} />
              </div>
            )}

            {selectedCalc && grpNights > 0 && (() => {
              const depositVal = grpDepositAmount ? parseFloat(grpDepositAmount) : 0;
              return (
                <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                  <div className="text-muted-foreground">{t("groupBookings.calcFormula")}:</div>
                  <div className="flex justify-between">
                    <span>{selectedCalc.price_per_person_per_night} × {groupGuests} × {grpNights}</span>
                    <span className="font-semibold">{hotelConfig.currencySymbol}{calcTotal.toLocaleString()}</span>
                  </div>
                  {selectedCalc.services && selectedCalc.services.length > 0 && (
                    <div className="text-xs text-muted-foreground pt-1">
                      {selectedCalc.services.map(s => `${s.service_name}${s.cost != null ? ` (${s.cost} грн)` : ""}`).join(", ")}
                    </div>
                  )}
                  {depositVal > 0 && (
                    <>
                      <div className="flex justify-between text-green-600 border-t pt-1">
                        <span>{t("groupBookings.depositAmount")}</span>
                        <span>−{hotelConfig.currencySymbol}{depositVal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>{t("groupBookings.remainingBalance")}</span>
                        <span>{hotelConfig.currencySymbol}{Math.max(0, calcTotal - depositVal).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {selectedCalcId === "custom" && customPricePerPersonNight && grpNights > 0 && (() => {
              const depositVal = grpDepositAmount ? parseFloat(grpDepositAmount) : 0;
              return (
                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  <div className="text-muted-foreground">{t("groupBookings.calcFormula")}:</div>
                  <div className="flex justify-between font-semibold">
                    <span>{customPricePerPersonNight} × {groupGuests} × {grpNights}</span>
                    <span>{hotelConfig.currencySymbol}{customCalcTotal.toLocaleString()}</span>
                  </div>
                  {depositVal > 0 && (
                    <>
                      <div className="flex justify-between text-green-600 border-t pt-1">
                        <span>{t("groupBookings.depositAmount")}</span>
                        <span>−{hotelConfig.currencySymbol}{depositVal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>{t("groupBookings.remainingBalance")}</span>
                        <span>{hotelConfig.currencySymbol}{Math.max(0, customCalcTotal - depositVal).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("groupBookings.cancel")}</Button>
              <Button disabled={!grpValid || createGroupMutation.isPending} onClick={() => createGroupMutation.mutate({
                checkIn: grpCheckIn!, checkOut: grpCheckOut!,
                roomUnitIds: grpSelectedRoomIds, allRoomUnits: allRoomUnits ?? [],
                bookingName, contactPerson, phone: groupPhone,
                numGuests: parseInt(groupGuests), selectedCalcId, customPricePerPersonNight,
                finalGroupTotal, customCalcTotal, status: grpStatus,
                adminNotes: grpAdminNotes, depositAmount: grpDepositAmount,
              })}>
                {createGroupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("groupBookings.create")}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared DatePicker helper ───────────────────────────────────────────────────
function DatePicker({
  label, value, onChange, disableBefore, locale,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  disableBefore?: Date;
  locale: Locale;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP", { locale }) : "—"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange}
            disabled={disableBefore ? (d) => d < disableBefore : undefined}
            locale={locale} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
