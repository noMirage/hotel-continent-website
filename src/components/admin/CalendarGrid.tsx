import { useRef, useEffect } from "react";
import { format, parseISO, isToday, differenceInDays } from "date-fns";
import {
  CheckCircle2, AlertTriangle, Wrench, BedDouble, BedSingle, Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { bookingPillClass } from "@/components/admin/CalendarBookingDialog";
import type { Reservation, GroupBooking, BookingStatus } from "@/lib/supabase-types";
import type { CalendarRoomUnit } from "@/hooks/useCalendarData";

// ── Exported types ────────────────────────────────────────────────────────────

export interface ResCellItem {
  res: Reservation;
  startCol: number;
  span: number;
  isActualStart: boolean;
  isActualEnd: boolean;
}

export interface GrpCellItem {
  gb: GroupBooking;
  startCol: number;
  span: number;
  isActualStart: boolean;
  isActualEnd: boolean;
}

export interface CreateDrag {
  kind: "create";
  startRoomUnitId: string;
  endRoomUnitId: string;
  roomTypeId: string;
  startCol: number;
  endCol: number;
}

export interface MoveDrag {
  kind: "move";
  reservation: Reservation;
  grabOffset: number;
  originalRoomUnitId: string;
  currentRoomUnitId: string;
  currentStartCol: number;
}

export type DragState = CreateDrag | MoveDrag | null;

export interface PillMouseDown {
  reservation: Reservation;
  startCol: number;
  colIdx: number;
  roomUnitId: string;
  clientX: number;
  clientY: number;
}

// ── Private helpers ───────────────────────────────────────────────────────────

type CleanlinessStatus = "clean" | "dirty" | "under_renovation";

function cleanlinessConfig(s: CleanlinessStatus, t: (k: string) => string) {
  switch (s) {
    case "dirty":
      return { label: t("calendar.dirty"),            bg: "bg-red-500/20",    icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> };
    case "under_renovation":
      return { label: t("calendar.underRenovation"),  bg: "bg-stone-500/25",  icon: <Wrench className="h-3.5 w-3.5 text-stone-600" /> };
    default:
      return { label: t("calendar.clean"),            bg: "",                 icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> };
  }
}

function bedConfigLabel(cfg: string | null, t: (k: string) => string) {
  if (cfg === "double_bed")      return { label: t("roomManager.doubleBed"),     icon: <BedDouble className="h-3 w-3" /> };
  if (cfg === "twin_beds")       return { label: t("roomManager.twinBeds"),       icon: <BedSingle className="h-3 w-3" /> };
  if (cfg === "double_bed_sofa") return { label: t("roomManager.doubleBedSofa"), icon: <BedDouble className="h-3 w-3" /> };
  if (cfg === "triple_single")   return { label: t("roomManager.tripleSingle"),   icon: <BedSingle className="h-3 w-3" /> };
  if (cfg === "quad_single")     return { label: t("roomManager.quadSingle"),     icon: <BedSingle className="h-3 w-3" /> };
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  visibleDays: number;
  cellWidth: number;
  days: Date[];
  roomUnits: CalendarRoomUnit[] | undefined;
  roomsByFloor: Array<[number | null, CalendarRoomUnit[]]>;
  language: string;
  t: (k: string) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dateLocale: any;
  reservationsByRoom: Map<string, ResCellItem[]>;
  groupResByRoom: Map<string, GrpCellItem[]>;
  dragState: DragState;
  isCellOccupied: (roomUnitId: string, colIdx: number, excludeId?: string) => boolean;
  isCellInCreateSelection: (roomUnitId: string, colIdx: number) => boolean;
  isCreateSelectionValid: boolean;
  ghostValid: boolean;
  getGhostForCell: (roomUnitId: string, colIdx: number) => { res: Reservation; span: number } | null;
  cleanlinessPopover: string | null;
  setCleanlinessPopover: (id: string | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateCleanlinessMutation: any;
  pillMouseDownRef: React.MutableRefObject<PillMouseDown | null>;
  handleCellMouseDown: (roomUnitId: string, roomTypeId: string, colIdx: number) => void;
  handleCellMouseEnter: (roomUnitId: string, colIdx: number) => void;
  handleCellMouseUp: () => void;
  onClearDrag: () => void;
  onGroupBookingClick: (gb: GroupBooking) => void;
}

const EDGE_ZONE = 80;  // px from top/bottom that triggers auto-scroll
const MAX_SPEED = 14;  // max pixels scrolled per animation frame

export function CalendarGrid({
  visibleDays, cellWidth, days, roomUnits, roomsByFloor,
  language, t, dateLocale,
  reservationsByRoom, groupResByRoom,
  dragState, isCellOccupied, isCellInCreateSelection, isCreateSelectionValid,
  ghostValid, getGhostForCell,
  cleanlinessPopover, setCleanlinessPopover, updateCleanlinessMutation,
  pillMouseDownRef,
  handleCellMouseDown, handleCellMouseEnter, handleCellMouseUp, onClearDrag,
  onGroupBookingClick,
}: Props) {
  const scrollRef      = useRef<HTMLDivElement>(null);
  const rafRef         = useRef<number | null>(null);
  const scrollSpeedRef = useRef(0);
  const mousePosRef    = useRef({ x: 0, y: 0 });
  // Keep a stable ref to the latest handleCellMouseEnter so the RAF closure
  // never holds a stale capture of that callback.
  const mouseEnterRef  = useRef(handleCellMouseEnter);
  useEffect(() => { mouseEnterRef.current = handleCellMouseEnter; });

  useEffect(() => {
    if (dragState?.kind !== "create") {
      scrollSpeedRef.current = 0;
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }

    const container = scrollRef.current;
    if (!container) return;

    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      const rect = container.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const h    = rect.height;

      if (relY < EDGE_ZONE && relY >= 0) {
        scrollSpeedRef.current = -MAX_SPEED * (1 - relY / EDGE_ZONE);
      } else if (relY > h - EDGE_ZONE && relY <= h) {
        scrollSpeedRef.current =  MAX_SPEED * (1 - (h - relY) / EDGE_ZONE);
      } else {
        scrollSpeedRef.current = 0;
      }
    };

    const tick = () => {
      const speed = scrollSpeedRef.current;
      if (speed !== 0 && scrollRef.current) {
        const before = scrollRef.current.scrollTop;
        scrollRef.current.scrollTop += speed;
        if (scrollRef.current.scrollTop !== before) {
          // After the DOM scrolls, find which cell is now under the cursor and
          // extend the selection into it, mirroring normal onMouseEnter behaviour.
          const el   = document.elementFromPoint(mousePosRef.current.x, mousePosRef.current.y);
          const cell = el?.closest<HTMLElement>("[data-room-unit-id]");
          if (cell) {
            const roomUnitId = cell.dataset.roomUnitId!;
            const colIdx     = parseInt(cell.dataset.colIdx ?? "", 10);
            if (!isNaN(colIdx)) mouseEnterRef.current(roomUnitId, colIdx);
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    document.addEventListener("mousemove", onMouseMove);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      scrollSpeedRef.current = 0;
    };
  }, [dragState?.kind]);

  return (
    <Card>
      <CardContent className="p-0">
        <div ref={scrollRef} className="w-full h-[calc(100vh-180px)] overflow-auto">
          <div
            className="select-none w-full"
            style={{ minWidth: `${160 + visibleDays * cellWidth}px` }}
            onMouseLeave={() => { if (dragState?.kind === "create") onClearDrag(); }}
            onMouseUp={handleCellMouseUp}
          >
            {/* Day header row */}
            <div className="grid border-b-2 border-border sticky top-0 z-20 bg-card shadow-sm" style={{ gridTemplateColumns: `160px repeat(${visibleDays}, minmax(${cellWidth}px, 1fr))`, transform: 'translateZ(0)' }}>
              <div className="p-3 border-r border-border text-sm font-medium text-muted-foreground sticky left-0 z-[1] bg-card">{t("calendar.room")}</div>
              {days.map(day => (
                <div key={day.toISOString()} className={cn(
                  "p-2 text-center text-xs border-r border-border last:border-r-0",
                  isToday(day) && "bg-primary/10 font-bold text-primary",
                  (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/40"
                )}>
                  <div className="font-medium">{format(day, "EEE", { locale: dateLocale })}</div>
                  <div>{format(day, "d")}</div>
                </div>
              ))}
            </div>

            {/* Room rows grouped by floor */}
            {roomUnits && roomUnits.length > 0 ? roomsByFloor.flatMap(([floor, units]) => [
              <div
                key={`floor-${floor}`}
                className="grid border-b border-border bg-muted/60"
                style={{ gridTemplateColumns: `160px repeat(${visibleDays}, minmax(${cellWidth}px, 1fr))` }}
              >
                <div className="px-3 py-1.5 border-r border-border flex items-center sticky left-0 z-[11] bg-muted">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {floor !== null ? `${t("roomManager.floor")} ${floor}` : t("calendar.noFloor")}
                  </span>
                </div>
                {days.map((_, colIdx) => (
                  <div key={colIdx} className="border-r border-border last:border-r-0" />
                ))}
              </div>,

              ...units.map(unit => {
                const unitRes  = reservationsByRoom.get(unit.id) ?? [];
                const clean    = (unit.cleanliness_status ?? "clean") as CleanlinessStatus;
                const cleanCfg = cleanlinessConfig(clean, t);
                const bedInfo  = bedConfigLabel(unit.bed_config ?? null, t);

                return (
                  <div key={unit.id} className="grid border-b border-border last:border-b-0"
                    style={{ gridTemplateColumns: `160px repeat(${visibleDays}, minmax(${cellWidth}px, 1fr))` }}>

                    {/* Room label with cleanliness popover */}
                    <div className="sticky left-0 z-[11] border-r border-border bg-card">
                    <div className={cn("p-3 flex flex-col justify-center h-full", cleanCfg.bg)}>
                      <Popover
                        open={cleanlinessPopover === unit.id}
                        onOpenChange={open => setCleanlinessPopover(open ? unit.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-1 text-left group">
                            {cleanCfg.icon}
                            <span className="text-sm font-medium text-foreground group-hover:underline">
                              {language === "uk" ? `Кімн. ${unit.room_number}` : `Rm ${unit.room_number}`}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1" align="start">
                          <p className="text-xs font-semibold text-muted-foreground px-2 py-1">{t("calendar.cleanliness")}</p>
                          {(["clean", "dirty", "under_renovation"] as CleanlinessStatus[]).map(s => {
                            const cfg = cleanlinessConfig(s, t);
                            return (
                              <button
                                key={s}
                                className={cn(
                                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted",
                                  clean === s && "bg-muted font-medium"
                                )}
                                onClick={() => updateCleanlinessMutation.mutate({ id: unit.id, status: s })}
                              >
                                {cfg.icon}
                                {cfg.label}
                              </button>
                            );
                          })}
                        </PopoverContent>
                      </Popover>
                      <span className="text-xs text-muted-foreground truncate">
                        {language === "uk"
                          ? (unit.room_type?.name_uk || unit.room_type?.name)
                          : unit.room_type?.name}
                      </span>
                      {bedInfo && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground mt-0.5">
                          {bedInfo.icon}
                          <span className="truncate">{bedInfo.label}</span>
                        </span>
                      )}
                    </div>
                    </div>

                    {/* Day cells */}
                    {days.map((day, colIdx) => {
                      const resStartingHere = unitRes.filter(r => r.startCol === colIdx);
                      const grpStartingHere = (groupResByRoom.get(unit.id) ?? []).filter(g => g.startCol === colIdx);
                      const occupied = isCellOccupied(unit.id, colIdx);
                      const inSel    = isCellInCreateSelection(unit.id, colIdx);
                      const ghost    = getGhostForCell(unit.id, colIdx);

                      return (
                        <div
                          key={colIdx}
                          data-room-unit-id={unit.id}
                          data-col-idx={String(colIdx)}
                          className={cn(
                            "min-h-14 border-r border-border last:border-r-0 relative",
                            (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/20",
                            isToday(day) && "bg-primary/5",
                            !occupied && "cursor-crosshair",
                            inSel && isCreateSelectionValid  && "bg-primary/20",
                            inSel && !isCreateSelectionValid && "bg-destructive/20",
                          )}
                          onMouseDown={() => handleCellMouseDown(unit.id, unit.room_type_id, colIdx)}
                          onMouseEnter={() => handleCellMouseEnter(unit.id, colIdx)}
                        >
                          {/* Regular booking pills */}
                          {resStartingHere.map(({ res, span, isActualStart, isActualEnd }) => {
                            const isBeingMoved    = dragState?.kind === "move" && dragState.reservation.id === res.id;
                            const hasEarlyCheckin = Number(res.early_checkin_fee) > 0;
                            const hasLateCheckout = Number(res.late_checkout_fee) > 0;
                            const leftFrac  = isActualStart ? (hasEarlyCheckin ? 0 : 0.5) : 0;
                            const rightFrac = isActualEnd   ? (hasLateCheckout ? 1.0 : 0.5) : 0;
                            const effectiveW = span - leftFrac + rightFrac;

                            return (
                              <Tooltip key={`res-${res.id}`}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute inset-y-1.5 rounded-md flex items-center px-2 text-xs font-medium truncate z-10",
                                      bookingPillClass(res.status),
                                      isBeingMoved ? "opacity-30 cursor-grabbing" : "cursor-grab"
                                    )}
                                    style={{
                                      left: `calc(${leftFrac * 100}% + 2px)`,
                                      width: `calc(${effectiveW * 100}% - 4px)`,
                                    }}
                                    onMouseDown={e => {
                                      e.stopPropagation();
                                      pillMouseDownRef.current = {
                                        reservation: res,
                                        startCol: colIdx,
                                        colIdx,
                                        roomUnitId: unit.id,
                                        clientX: e.clientX,
                                        clientY: e.clientY,
                                      };
                                    }}
                                  >
                                    {res.guest_name}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs space-y-1">
                                  <p className="font-semibold">{res.guest_name}</p>
                                  <p className="text-xs">
                                    {format(parseISO(res.check_in_date), "dd.MM.yyyy")} – {format(parseISO(res.check_out_date), "dd.MM.yyyy")}
                                  </p>
                                  {(() => {
                                    const total   = Number(res.total_price);
                                    const deposit = res.deposit_amount != null ? Number(res.deposit_amount) : null;
                                    const balance = deposit != null ? Math.max(0, total - deposit) : null;
                                    const tt      = Number(res.tourist_tax_amount ?? 0);
                                    return (
                                      <>
                                        <p className="text-xs">{t("bookings.grandTotal")}: {(total + tt).toLocaleString()} UAH</p>
                                        {deposit != null && (
                                          <p className="text-xs">
                                            {t("bookings.depositAmount")}: {deposit.toLocaleString()} / {t("bookings.remainingBalance")}: {balance!.toLocaleString()} UAH
                                            {tt > 0 && ` + ${t("bookings.touristTax")} (${t("bookings.touristTaxOnSite")})`}
                                          </p>
                                        )}
                                      </>
                                    );
                                  })()}
                                  {res.admin_notes && (
                                    <p className="text-xs text-muted-foreground italic">{res.admin_notes}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}

                          {/* Group booking pills */}
                          {grpStartingHere.map(({ gb, span, isActualStart, isActualEnd }) => {
                            const ra              = gb.room_assignments?.find(a => a.room_unit_id === unit.id);
                            const hasEarlyCheckin = Number(ra?.early_checkin_fee ?? 0) > 0;
                            const hasLateCheckout = Number(ra?.late_checkout_fee ?? 0) > 0;
                            const leftFrac  = isActualStart ? (hasEarlyCheckin ? 0 : 0.5) : 0;
                            const rightFrac = isActualEnd   ? (hasLateCheckout ? 1.0 : 0.5) : 0;
                            const effectiveW = span - leftFrac + rightFrac;
                            return (
                              <Tooltip key={`gb-${gb.id}-${unit.id}`}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute inset-y-1.5 rounded-md flex items-center gap-1 px-2 text-xs font-medium truncate z-10 cursor-pointer",
                                      bookingPillClass(gb.status as BookingStatus)
                                    )}
                                    style={{
                                      left: `calc(${leftFrac * 100}% + 2px)`,
                                      width: `calc(${effectiveW * 100}% - 4px)`,
                                    }}
                                    onMouseDown={e => e.stopPropagation()}
                                    onClick={() => onGroupBookingClick(gb)}
                                  >
                                    <Users className="h-3 w-3 shrink-0 opacity-80" />
                                    <span className="truncate">{gb.booking_name}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs space-y-1">
                                  <p className="font-semibold flex items-center gap-1">
                                    <Users className="h-3 w-3" />{gb.booking_name}
                                  </p>
                                  <p className="text-xs">{gb.contact_person}</p>
                                  <p className="text-xs">
                                    {format(parseISO(gb.check_in_date), "dd.MM.yyyy")} – {format(parseISO(gb.check_out_date), "dd.MM.yyyy")}
                                  </p>
                                  <p className="text-xs">{t("bookings.grandTotal")}: {Number(gb.total_price).toLocaleString()} UAH</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}

                          {/* Move-drag ghost */}
                          {ghost && (
                            <div
                              className={cn(
                                "absolute inset-y-1.5 rounded-md flex items-center px-2 text-xs font-medium truncate z-20 border-2 border-dashed",
                                ghostValid
                                  ? bookingPillClass(ghost.res.status) + " opacity-80"
                                  : "bg-destructive/40 text-destructive border-destructive"
                              )}
                              style={{
                                left: "calc(50% + 2px)",
                                width: `calc(${ghost.span * 100}% - 4px)`,
                              }}
                            >
                              {ghost.res.guest_name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }),
            ]) : (
              <div className="p-12 text-center text-muted-foreground">{t("calendar.noRooms")}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
