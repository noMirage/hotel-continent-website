import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  format, addDays, subDays, eachDayOfInterval,
  differenceInDays, isToday, parseISO,
} from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, CalendarIcon,
  AlertTriangle, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { Reservation, GroupBooking } from "@/lib/supabase-types";
import { CalendarGroupDialog } from "@/components/admin/CalendarGroupDialog";
import { CalendarBookingDialog } from "@/components/admin/CalendarBookingDialog";
import { GroupBookingDetailsDialog } from "@/components/admin/GroupBookingDetailsDialog";
import { GuestFormDialog } from "@/components/admin/GuestFormDialog";
import { CalendarGrid } from "@/components/admin/CalendarGrid";
import type { DragState, CreateDrag, MoveDrag, PillMouseDown, ResCellItem, GrpCellItem } from "@/components/admin/CalendarGrid";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useCalendarRooms, useCalendarReservations, useCalendarGroupBookings } from "@/hooks/useCalendarData";
import type { CalendarRoomUnit } from "@/hooks/useCalendarData";
import { useCalendarMutations } from "@/hooks/useCalendarMutations";

// ─── Constants ────────────────────────────────────────────────────────────────

const ZOOM_PCTS    = [50, 75, 100, 125, 150] as const;
const VISIBLE_DAYS = 30;
const BASE_CELL_W  = 72;

const LEGEND: Array<{ labelKey: string; cls: string }> = [
  { labelKey: "calendar.unprocessed", cls: "bg-orange-500/70" },
  { labelKey: "calendar.pending",     cls: "bg-amber-500/70" },
  { labelKey: "calendar.confirmed",   cls: "bg-blue-600/70" },
  { labelKey: "calendar.checkIn",     cls: "bg-green-600/70" },
  { labelKey: "calendar.checkOut",    cls: "bg-stone-600/70" },
  { labelKey: "calendar.dragToBook",  cls: "bg-primary/20 border-2 border-primary border-dashed" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCalendar() {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { toast } = useToast();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });
  const [zoomIdx, setZoomIdx] = useState(0);
  const visibleDays = VISIBLE_DAYS;
  const zoomPct     = ZOOM_PCTS[zoomIdx];
  const cellWidth   = Math.round(BASE_CELL_W * zoomPct / 100);

  const [datePickerOpen,    setDatePickerOpen]    = useState(false);
  const [cleanlinessPopover, setCleanlinessPopover] = useState<string | null>(null);

  // Drag state
  const dragStateRef    = useRef<DragState>(null);
  const pillMouseDownRef = useRef<PillMouseDown | null>(null);
  const [dragState, setDragStateLocal] = useState<DragState>(null);

  function setDragState(s: DragState) {
    dragStateRef.current = s;
    setDragStateLocal(s);
  }

  // Dialogs
  const [bookingDialog, setBookingDialog] = useState<{
    open: boolean;
    selectedRoomUnits: CalendarRoomUnit[];
    checkIn?: Date; checkOut?: Date;
  }>({ open: false, selectedRoomUnits: [] });
  const [selectedReservation,  setSelectedReservation]  = useState<Reservation | null>(null);
  const [checkinReservation,   setCheckinReservation]   = useState<Reservation | null>(null);
  const [selectedGroupBooking, setSelectedGroupBooking] = useState<GroupBooking | null>(null);

  const endDate = useMemo(() => addDays(startDate, visibleDays - 1), [startDate, visibleDays]);
  const days    = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

  // ── Data ─────────────────────────────────────────────────────────────────────

  const { data: roomUnits,    isLoading: roomsLoading } = useCalendarRooms();
  const { data: reservations, isLoading: resLoading   } = useCalendarReservations(startDate, endDate);
  const { data: groupBookings }                          = useCalendarGroupBookings(startDate, endDate);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const { updateCleanlinessMutation, moveMutation } = useCalendarMutations({
    onCleanlinessUpdated: () => setCleanlinessPopover(null),
  });

  // ── Computed layout ───────────────────────────────────────────────────────────

  const roomsByFloor = useMemo(() => {
    if (!roomUnits) return [];
    const floorMap = new Map<number | null, typeof roomUnits>();
    for (const unit of roomUnits) {
      const arr = floorMap.get(unit.floor) ?? [];
      arr.push(unit);
      floorMap.set(unit.floor, arr);
    }
    return Array.from(floorMap.entries()).sort(([a], [b]) => {
      if (a === null && b === null) return 0;
      if (a === null) return -1;
      if (b === null) return 1;
      return a - b;
    });
  }, [roomUnits]);

  const roomUnitsList = useMemo(
    () => roomsByFloor.flatMap(([, units]) => units),
    [roomsByFloor]
  );

  const reservationsByRoom = useMemo(() => {
    const map = new Map<string, ResCellItem[]>();
    if (!reservations) return map;
    for (const res of reservations) {
      const checkIn  = parseISO(res.check_in_date);
      const checkOut = parseISO(res.check_out_date);
      const isActualStart = checkIn >= startDate;
      const isActualEnd   = checkOut <= endDate;
      const visStart   = isActualStart ? checkIn : startDate;
      const clippedEnd = addDays(endDate, 1);
      const visEnd     = checkOut > clippedEnd ? clippedEnd : checkOut;
      const startCol   = differenceInDays(visStart, startDate);
      const span       = differenceInDays(visEnd, visStart);
      if (span <= 0) continue;
      const arr = map.get(res.room_unit_id) ?? [];
      arr.push({ res, startCol, span, isActualStart, isActualEnd });
      map.set(res.room_unit_id, arr);
    }
    return map;
  }, [reservations, startDate, endDate]);

  const groupResByRoom = useMemo(() => {
    const map = new Map<string, GrpCellItem[]>();
    if (!groupBookings) return map;
    for (const gb of groupBookings) {
      for (const roomUnitId of [...new Set(gb.room_unit_ids)]) {
        const ra = gb.room_assignments?.find(a => a.room_unit_id === roomUnitId);
        const checkIn  = parseISO(ra?.check_in_override  ?? gb.check_in_date);
        const checkOut = parseISO(ra?.check_out_override ?? gb.check_out_date);
        if (checkOut <= checkIn) continue;
        const isActualStart = checkIn >= startDate;
        const isActualEnd   = checkOut <= endDate;
        const visStart   = isActualStart ? checkIn : startDate;
        const clippedEnd = addDays(endDate, 1);
        const visEnd     = checkOut > clippedEnd ? clippedEnd : checkOut;
        const startCol   = differenceInDays(visStart, startDate);
        const span       = differenceInDays(visEnd, visStart);
        if (span <= 0) continue;
        const arr = map.get(roomUnitId) ?? [];
        arr.push({ gb, startCol, span, isActualStart, isActualEnd });
        map.set(roomUnitId, arr);
      }
    }
    return map;
  }, [groupBookings, startDate, endDate]);

  // ── Availability helpers ──────────────────────────────────────────────────────

  const isCellOccupied = useCallback((roomUnitId: string, colIdx: number, excludeId?: string) => {
    for (const r of reservationsByRoom.get(roomUnitId) ?? []) {
      if (excludeId && r.res.id === excludeId) continue;
      if (colIdx >= r.startCol && colIdx < r.startCol + r.span) return true;
      if (Number(r.res.late_checkout_fee) > 0 && r.isActualEnd && colIdx === r.startCol + r.span) return true;
    }
    for (const g of groupResByRoom.get(roomUnitId) ?? []) {
      if (colIdx >= g.startCol && colIdx < g.startCol + g.span) return true;
      const ra = g.gb.room_assignments?.find(a => a.room_unit_id === roomUnitId);
      if (ra && Number(ra.late_checkout_fee) > 0 && g.isActualEnd && colIdx === g.startCol + g.span) return true;
    }
    return false;
  }, [reservationsByRoom, groupResByRoom]);

  // Same as isCellOccupied but ignores late-checkout extension so that a new
  // check-in on the same day as a late checkout is not incorrectly blocked.
  const isCellBlockedForCheckIn = useCallback((roomUnitId: string, colIdx: number) => {
    for (const r of reservationsByRoom.get(roomUnitId) ?? []) {
      if (colIdx >= r.startCol && colIdx < r.startCol + r.span) return true;
    }
    for (const g of groupResByRoom.get(roomUnitId) ?? []) {
      if (colIdx >= g.startCol && colIdx < g.startCol + g.span) return true;
    }
    return false;
  }, [reservationsByRoom, groupResByRoom]);

  // Returns true when colIdx is the check-in day of a reservation with an
  // early check-in fee. Checking out on that day creates a real conflict
  // (room can't be cleaned in time), so it must be blocked separately even
  // though checkEndCol = maxCol - 1 skips the normal stay-night check.
  const hasCellEarlyCheckin = useCallback((roomUnitId: string, colIdx: number) => {
    for (const r of reservationsByRoom.get(roomUnitId) ?? []) {
      if (r.startCol === colIdx && r.isActualStart && Number(r.res.early_checkin_fee) > 0) return true;
    }
    for (const g of groupResByRoom.get(roomUnitId) ?? []) {
      if (g.startCol === colIdx && g.isActualStart) {
        const ra = g.gb.room_assignments?.find(a => a.room_unit_id === roomUnitId);
        if (ra && Number(ra.early_checkin_fee) > 0) return true;
      }
    }
    return false;
  }, [reservationsByRoom, groupResByRoom]);

  const isRangeAvailable = useCallback((roomUnitId: string, fromCol: number, toCol: number, excludeId?: string) => {
    for (let c = fromCol; c <= toCol; c++) {
      if (isCellOccupied(roomUnitId, c, excludeId)) return false;
    }
    return true;
  }, [isCellOccupied]);

  // ── Global mouse event listeners ──────────────────────────────────────────────

  useEffect(() => {
    const DRAG_THRESHOLD = 5;

    const onMouseMove = (e: MouseEvent) => {
      const pill = pillMouseDownRef.current;
      if (!pill) return;
      const dist = Math.hypot(e.clientX - pill.clientX, e.clientY - pill.clientY);
      if (dist > DRAG_THRESHOLD && dragStateRef.current?.kind !== "move") {
        if (pill.reservation.status === "CHECK_OUT") {
          pillMouseDownRef.current = null;
          toast({ title: t("calendar.cannotMoveCheckOut"), description: t("calendar.cannotMoveCheckOutDesc"), variant: "destructive" });
          return;
        }
        const grabOffset = pill.colIdx - pill.startCol;
        setDragState({
          kind: "move",
          reservation: pill.reservation,
          grabOffset,
          originalRoomUnitId: pill.roomUnitId,
          currentRoomUnitId:  pill.roomUnitId,
          currentStartCol:    pill.startCol,
        });
      }
    };

    const onMouseUp = () => {
      const ds   = dragStateRef.current;
      const pill = pillMouseDownRef.current;

      if (ds?.kind === "move") {
        const { reservation: res, currentRoomUnitId, currentStartCol } = ds;
        const originalSpan = differenceInDays(parseISO(res.check_out_date), parseISO(res.check_in_date));
        const newCheckIn  = format(addDays(startDate, currentStartCol), "yyyy-MM-dd");
        const newCheckOut = format(addDays(startDate, currentStartCol + originalSpan), "yyyy-MM-dd");
        const endCol      = currentStartCol + originalSpan - 1;

        if (isRangeAvailable(currentRoomUnitId, currentStartCol, endCol, res.id)) {
          moveMutation.mutate({ reservationId: res.id, newCheckIn, newCheckOut, newRoomUnitId: currentRoomUnitId });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          toast({ title: t("calendar.notAvailable"), variant: "destructive" } as any);
        }
      } else if (pill && dragStateRef.current?.kind !== "create") {
        setSelectedReservation(pill.reservation);
      }

      pillMouseDownRef.current = null;
      setDragState(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, isRangeAvailable]);

  // ── Create-drag helpers ───────────────────────────────────────────────────────

  const handleCellMouseDown = useCallback((roomUnitId: string, roomTypeId: string, colIdx: number) => {
    if (isCellBlockedForCheckIn(roomUnitId, colIdx)) return;
    setDragState({ kind: "create", startRoomUnitId: roomUnitId, endRoomUnitId: roomUnitId, roomTypeId, startCol: colIdx, endCol: colIdx });
  }, [isCellBlockedForCheckIn]);

  const handleCellMouseEnter = useCallback((roomUnitId: string, colIdx: number) => {
    const ds = dragStateRef.current;
    if (!ds) return;
    if (ds.kind === "create") setDragState({ ...ds, endRoomUnitId: roomUnitId, endCol: colIdx });
    if (ds.kind === "move")   setDragState({ ...ds, currentRoomUnitId: roomUnitId, currentStartCol: colIdx - ds.grabOffset });
  }, []);

  const handleCellMouseUp = useCallback(() => {
    const ds = dragStateRef.current;
    if (ds?.kind !== "create") return;
    const minCol = Math.min(ds.startCol, ds.endCol);
    const maxCol = Math.max(ds.startCol, ds.endCol);

    const startIdx = roomUnitsList.findIndex(u => u.id === ds.startRoomUnitId);
    const endIdx   = roomUnitsList.findIndex(u => u.id === ds.endRoomUnitId);
    const minIdx   = Math.min(startIdx, endIdx);
    const maxIdx   = Math.max(startIdx, endIdx);
    const selected = roomUnitsList.slice(minIdx, maxIdx + 1);

    const checkEndCol = maxCol > minCol ? maxCol - 1 : maxCol;
    const noEarlyCheckinConflict = !selected.some(room => hasCellEarlyCheckin(room.id, maxCol));
    if (noEarlyCheckinConflict && selected.every(room => isRangeAvailable(room.id, minCol, checkEndCol)) && selected.length > 0) {
      setBookingDialog({
        open: true,
        selectedRoomUnits: selected,
        checkIn:  addDays(startDate, minCol),
        checkOut: addDays(startDate, maxCol > minCol ? maxCol : maxCol + 1),
      });
    }
    setDragState(null);
  }, [isRangeAvailable, hasCellEarlyCheckin, startDate, roomUnitsList]);

  const isCellInCreateSelection = useCallback((roomUnitId: string, colIdx: number) => {
    const ds = dragState;
    if (!ds || ds.kind !== "create") return false;
    const startIdx = roomUnitsList.findIndex(u => u.id === ds.startRoomUnitId);
    const endIdx   = roomUnitsList.findIndex(u => u.id === ds.endRoomUnitId);
    const thisIdx  = roomUnitsList.findIndex(u => u.id === roomUnitId);
    if (thisIdx < Math.min(startIdx, endIdx) || thisIdx > Math.max(startIdx, endIdx)) return false;
    const min = Math.min(ds.startCol, ds.endCol);
    const max = Math.max(ds.startCol, ds.endCol);
    return colIdx >= min && colIdx <= max;
  }, [dragState, roomUnitsList]);

  const isCreateSelectionValid = useMemo(() => {
    if (!dragState || dragState.kind !== "create") return false;
    const minCol   = Math.min(dragState.startCol, dragState.endCol);
    const maxCol   = Math.max(dragState.startCol, dragState.endCol);
    const startIdx = roomUnitsList.findIndex(u => u.id === dragState.startRoomUnitId);
    const endIdx   = roomUnitsList.findIndex(u => u.id === dragState.endRoomUnitId);
    const selected = roomUnitsList.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
    const checkEndCol = maxCol > minCol ? maxCol - 1 : maxCol;
    const noEarlyCheckinConflict = !selected.some(room => hasCellEarlyCheckin(room.id, maxCol));
    return noEarlyCheckinConflict && selected.every(room => isRangeAvailable(room.id, minCol, checkEndCol));
  }, [dragState, isRangeAvailable, hasCellEarlyCheckin, roomUnitsList]);

  // ── Move-drag ghost helpers ───────────────────────────────────────────────────

  function getGhostForCell(roomUnitId: string, colIdx: number): { res: Reservation; span: number } | null {
    if (!dragState || dragState.kind !== "move") return null;
    if (dragState.currentRoomUnitId !== roomUnitId || dragState.currentStartCol !== colIdx) return null;
    const origSpan = differenceInDays(parseISO(dragState.reservation.check_out_date), parseISO(dragState.reservation.check_in_date));
    return { res: dragState.reservation, span: origSpan };
  }

  function isGhostValid(): boolean {
    if (!dragState || dragState.kind !== "move") return false;
    const origSpan = differenceInDays(parseISO(dragState.reservation.check_out_date), parseISO(dragState.reservation.check_in_date));
    return isRangeAvailable(dragState.currentRoomUnitId, dragState.currentStartCol, dragState.currentStartCol + origSpan - 1, dragState.reservation.id);
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  const goBack    = () => setStartDate(d => subDays(d, Math.floor(visibleDays / 2)));
  const goForward = () => setStartDate(d => addDays(d, Math.floor(visibleDays / 2)));
  const goToday   = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setStartDate(d); };

  const isLoading  = roomsLoading || resLoading;
  const ghostValid = isGhostValid();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("calendar.title")}</h1>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{t("calendar.title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7"
              disabled={zoomIdx === 0} onClick={() => setZoomIdx(i => Math.max(0, i - 1))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium px-1 min-w-[40px] text-center">
              {zoomPct}%
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7"
              disabled={zoomIdx === ZOOM_PCTS.length - 1} onClick={() => setZoomIdx(i => Math.min(ZOOM_PCTS.length - 1, i + 1))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={goToday}>{t("calendar.today")}</Button>

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {t("calendar.jumpToDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                mode="single"
                selected={startDate}
                onSelect={d => {
                  if (d) { const nd = new Date(d); nd.setHours(0,0,0,0); setStartDate(nd); }
                  setDatePickerOpen(false);
                }}
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={goBack}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-semibold text-foreground min-w-[180px] text-center text-sm">
              {format(startDate, "MMM d", { locale: dateLocale })} — {format(endDate, "MMM d, yyyy", { locale: dateLocale })}
            </span>
            <Button variant="outline" size="icon" onClick={goForward}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4">
        {LEGEND.map(item => (
          <div key={item.labelKey} className="flex items-center gap-2">
            <div className={cn("w-4 h-4 rounded", item.cls)} />
            <span className="text-sm text-muted-foreground">{t(item.labelKey as any)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          <span>{t("calendar.dirty")}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Wrench className="h-3.5 w-3.5 text-stone-500" />
          <span>{t("calendar.underRenovation")}</span>
        </div>
      </div>

      {/* ── Calendar grid ───────────────────────────────────────────────────── */}
      <CalendarGrid
        visibleDays={visibleDays}
        cellWidth={cellWidth}
        days={days}
        roomUnits={roomUnits}
        roomsByFloor={roomsByFloor}
        language={language}
        t={t}
        dateLocale={dateLocale}
        reservationsByRoom={reservationsByRoom}
        groupResByRoom={groupResByRoom}
        dragState={dragState}
        isCellOccupied={isCellBlockedForCheckIn}
        isCellInCreateSelection={isCellInCreateSelection}
        isCreateSelectionValid={isCreateSelectionValid}
        ghostValid={ghostValid}
        getGhostForCell={getGhostForCell}
        cleanlinessPopover={cleanlinessPopover}
        setCleanlinessPopover={setCleanlinessPopover}
        updateCleanlinessMutation={updateCleanlinessMutation}
        pillMouseDownRef={pillMouseDownRef}
        handleCellMouseDown={handleCellMouseDown}
        handleCellMouseEnter={handleCellMouseEnter}
        handleCellMouseUp={handleCellMouseUp}
        onClearDrag={() => setDragState(null)}
        onGroupBookingClick={setSelectedGroupBooking}
      />

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <CalendarGroupDialog
        open={bookingDialog.open}
        onOpenChange={open => setBookingDialog(prev => ({ ...prev, open }))}
        selectedRoomUnits={bookingDialog.selectedRoomUnits}
        initialCheckIn={bookingDialog.checkIn}
        initialCheckOut={bookingDialog.checkOut}
      />

      <CalendarBookingDialog
        reservation={selectedReservation}
        onClose={() => setSelectedReservation(null)}
        onOpenCheckin={res => setCheckinReservation(res)}
      />

      {checkinReservation && (
        <GuestFormDialog
          open={!!checkinReservation}
          onOpenChange={open => { if (!open) setCheckinReservation(null); }}
          reservation={checkinReservation}
        />
      )}

      <GroupBookingDetailsDialog
        booking={selectedGroupBooking}
        onClose={() => setSelectedGroupBooking(null)}
      />
    </div>
  );
}
