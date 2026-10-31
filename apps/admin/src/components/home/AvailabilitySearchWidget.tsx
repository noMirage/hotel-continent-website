import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { CalendarIcon, Search, Users, Baby, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

export interface RoomSearchEntry {
  id: number;
  adults: number;
  children: number;
  childrenAges: number[];
}

export interface SearchParams {
  checkIn: Date;
  checkOut: Date;
  rooms: RoomSearchEntry[];
}

interface Props {
  onSearch: (params: SearchParams) => void;
}

let _nextId = 2;

export function AvailabilitySearchWidget({ onSearch }: Props) {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);

  const [checkIn, setCheckIn]   = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [rooms, setRooms]       = useState<RoomSearchEntry[]>([{ id: 1, adults: 2, children: 0, childrenAges: [] }]);
  const [expandedRoom, setExpandedRoom] = useState<number | null>(null);

  const nightsLabel = (n: number) => {
    if (language === "uk") {
      if (n === 1) return t("search.night_one");
      if (n >= 2 && n <= 4) return t("search.night_few");
      return t("search.night_many");
    }
    return n === 1 ? t("search.night_one") : t("search.night_few");
  };

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000))
    : null;

  function updateRoom(id: number, patch: Partial<RoomSearchEntry>) {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  function handleChildrenChange(roomId: number, count: number) {
    const room = rooms.find(r => r.id === roomId)!;
    const ages = [...room.childrenAges];
    while (ages.length < count) ages.push(5);
    updateRoom(roomId, { children: count, childrenAges: ages.slice(0, count) });
    if (count > 0) setExpandedRoom(roomId);
    else if (expandedRoom === roomId) setExpandedRoom(null);
  }

  function addRoom() {
    const id = _nextId++;
    setRooms(prev => [...prev, { id, adults: 1, children: 0, childrenAges: [] }]);
  }

  function removeRoom(id: number) {
    setRooms(prev => prev.filter(r => r.id !== id));
    if (expandedRoom === id) setExpandedRoom(null);
  }

  function handleSearch() {
    if (!checkIn || !checkOut) return;
    onSearch({ checkIn, checkOut, rooms });
  }

  const ageOptions = Array.from({ length: 18 }, (_, i) => i);
  const totalAdults   = rooms.reduce((s, r) => s + r.adults, 0);
  const totalChildren = rooms.reduce((s, r) => s + r.children, 0);

  return (
    <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/30 p-4 md:p-6">

      {/* Date row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {/* Check-in */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("search.checkIn")}</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11 border-border/60", !checkIn && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4 text-primary/70" />
                {checkIn ? format(checkIn, "dd MMM yyyy", { locale: dateLocale }) : t("search.selectDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single" selected={checkIn}
                onSelect={(d) => { setCheckIn(d ?? undefined); if (d && (!checkOut || checkOut <= d)) setCheckOut(addDays(d, 1)); }}
                disabled={(d) => d < today} locale={dateLocale} initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Check-out */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("search.checkOut")}</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11 border-border/60", !checkOut && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4 text-primary/70" />
                {checkOut ? (
                  <span>
                    {format(checkOut, "dd MMM yyyy", { locale: dateLocale })}
                    {nights !== null && nights > 0 && <span className="ml-2 text-xs text-muted-foreground">({nights} {nightsLabel(nights)})</span>}
                  </span>
                ) : t("search.selectDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single" selected={checkOut}
                onSelect={(d) => setCheckOut(d ?? undefined)}
                disabled={(d) => !checkIn ? d < tomorrow : d <= checkIn}
                locale={dateLocale} initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Rooms */}
      <div className="space-y-2 mb-3">
        {rooms.map((room, idx) => (
          <div key={room.id} className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
            {/* Room header */}
            <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
              <span className="text-sm font-semibold text-foreground min-w-[60px]">
                {t("roomDetails.roomN").replace("{n}", String(idx + 1))}
              </span>

              {/* Adults + Children in a wrapping sub-row */}
              <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
                {/* Adults */}
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                  <span className="text-xs text-muted-foreground shrink-0">{t("search.adults")}</span>
                  <button type="button" onClick={() => updateRoom(room.id, { adults: Math.max(1, room.adults - 1) })}
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-sm hover:bg-muted transition-colors ml-1">−</button>
                  <span className="w-5 text-center text-sm font-semibold">{room.adults}</span>
                  <button type="button" onClick={() => updateRoom(room.id, { adults: Math.min(10, room.adults + 1) })}
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-sm hover:bg-muted transition-colors">+</button>
                </div>

                {/* Children */}
                <div className="flex items-center gap-1.5">
                  <Baby className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                  <span className="text-xs text-muted-foreground shrink-0">{t("search.children")}</span>
                  <button type="button" onClick={() => handleChildrenChange(room.id, Math.max(0, room.children - 1))}
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-sm hover:bg-muted transition-colors ml-1">−</button>
                  <span className="w-5 text-center text-sm font-semibold">{room.children}</span>
                  <button type="button" onClick={() => handleChildrenChange(room.id, Math.min(6, room.children + 1))}
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-sm hover:bg-muted transition-colors">+</button>
                  {room.children > 0 && (
                    <button type="button" onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                      className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
                      {expandedRoom === room.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Remove */}
              {rooms.length > 1 && (
                <button type="button" onClick={() => removeRoom(room.id)} title={t("roomDetails.removeRoom")}
                  className="text-destructive/60 hover:text-destructive transition-colors shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Children ages */}
            {room.children > 0 && expandedRoom === room.id && (
              <div className="px-4 pb-3 pt-1 border-t border-border/40 bg-muted/10">
                <p className="text-xs text-muted-foreground mb-2">{t("search.freeUnder5")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Array.from({ length: room.children }).map((_, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{t("search.childLabel", { n: String(i + 1) })}</p>
                      <Select
                        value={String(room.childrenAges[i] ?? 5)}
                        onValueChange={(v) => {
                          const ages = [...room.childrenAges];
                          ages[i] = parseInt(v);
                          updateRoom(room.id, { childrenAges: ages });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ageOptions.map(age => (
                            <SelectItem key={age} value={String(age)}>
                              {age === 0 ? t("search.under1") : `${age} ${t("search.years")}`}
                              {age < 5 && <span className="ml-1 text-xs text-primary font-medium">✓</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add room */}
        <button type="button" onClick={addRoom}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium py-1 px-1">
          <Plus className="h-4 w-4" />
          {t("roomDetails.addRoom")}
        </button>
      </div>

      {/* Summary + Search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {rooms.length} {rooms.length === 1 ? (language === "uk" ? "номер" : "room") : (language === "uk" ? "номери" : "rooms")}
          {" · "}{totalAdults} {t("search.adults").toLowerCase()}
          {totalChildren > 0 && ` · ${totalChildren} ${t("search.children").toLowerCase()}`}
        </p>
        <Button size="lg" className="h-11 px-6 text-base font-semibold flex-1 sm:flex-none"
          onClick={handleSearch} disabled={!checkIn || !checkOut}>
          <Search className="mr-2 h-4 w-4" />
          {t("search.searchBtn")}
        </Button>
      </div>
    </div>
  );
}
