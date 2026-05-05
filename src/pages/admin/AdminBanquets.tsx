import { useState } from "react";
import { format, parseISO } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import {
  Heart, Cake, Briefcase, Baby, Star, Monitor, Smile,
  CalendarDays, Users, Phone, MessageSquare, Check, X,
  BedDouble, UtensilsCrossed, Sparkles, Music, CheckCheck,
  Inbox, Loader2, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Reservation, EventType } from "@/lib/supabase-types";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIsViewer } from "@/hooks/useUserRole";
import { useAdminBanquets } from "@/hooks/useAdminBanquetsData";
import { useAdminBanquetsMutation } from "@/hooks/useAdminBanquetsMutation";

// ── Event type config ─────────────────────────────────────────────────────────

const EVENT_ICON: Record<EventType, React.ElementType> = {
  wedding:     Heart,
  birthday:    Cake,
  corporate:   Briefcase,
  christening: Baby,
  anniversary: Star,
  conference:  Monitor,
  kids_party:  Smile,
};

const EVENT_COLOR: Record<EventType, { bg: string; text: string; border: string; light: string }> = {
  wedding:     { bg: "bg-rose-500",    text: "text-rose-700",    border: "border-rose-200",   light: "bg-rose-50" },
  birthday:    { bg: "bg-yellow-400",  text: "text-yellow-700",  border: "border-yellow-200", light: "bg-yellow-50" },
  corporate:   { bg: "bg-blue-500",    text: "text-blue-700",    border: "border-blue-200",   light: "bg-blue-50" },
  christening: { bg: "bg-sky-400",     text: "text-sky-700",     border: "border-sky-200",    light: "bg-sky-50" },
  anniversary: { bg: "bg-amber-500",   text: "text-amber-700",   border: "border-amber-200",  light: "bg-amber-50" },
  conference:  { bg: "bg-slate-500",   text: "text-slate-700",   border: "border-slate-200",  light: "bg-slate-50" },
  kids_party:  { bg: "bg-green-400",   text: "text-green-700",   border: "border-green-200",  light: "bg-green-50" },
};

// ── Column config ─────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    id: "new" as const,
    statuses: ["UNPROCESSED"],
    headerBg: "bg-fuchsia-50",
    headerBorder: "border-fuchsia-200",
    headerText: "text-fuchsia-800",
    dot: "bg-fuchsia-400",
    icon: Inbox,
  },
  {
    id: "inprogress" as const,
    statuses: ["PENDING", "CONFIRMED", "CHECK_IN"],
    headerBg: "bg-amber-50",
    headerBorder: "border-amber-200",
    headerText: "text-amber-800",
    dot: "bg-amber-400",
    icon: Clock,
  },
  {
    id: "completed" as const,
    statuses: ["CHECK_OUT"],
    headerBg: "bg-emerald-50",
    headerBorder: "border-emerald-200",
    headerText: "text-emerald-800",
    dot: "bg-emerald-400",
    icon: CheckCheck,
  },
] as const;

// ── Sub-status badge (within In Progress) ─────────────────────────────────────

function SubStatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  if (status === "PENDING")   return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">{t("bookings.pending")}</span>;
  if (status === "CONFIRMED") return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{t("bookings.confirmed")}</span>;
  if (status === "CHECK_IN")  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{t("bookings.checkInStatus")}</span>;
  return null;
}

// ── Service tags ──────────────────────────────────────────────────────────────

function ServiceTags({ booking, t }: { booking: Reservation; t: (k: string) => string }) {
  const tags = [
    { active: booking.has_accommodation, icon: BedDouble,        label: t("banquet.services.accommodation") },
    { active: booking.has_menu,          icon: UtensilsCrossed,  label: t("banquet.services.menu") },
    { active: booking.has_decor,         icon: Sparkles,         label: t("banquet.services.decor") },
    { active: booking.has_music,         icon: Music,            label: t("banquet.services.music") },
  ].filter(tag => tag.active);

  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.map(({ icon: Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          <Icon className="h-2.5 w-2.5" />{label}
        </span>
      ))}
    </div>
  );
}

// ── Banquet card ──────────────────────────────────────────────────────────────

function BanquetCard({
  booking, columnId, t, dateLocale, isViewer, onAccept, onDecline, onComplete, onCancel, isPending,
  onDragStart, onDragEnd, isDragging,
}: {
  booking: Reservation;
  columnId: "new" | "inprogress" | "completed";
  t: (k: string) => string;
  dateLocale: any;
  isViewer: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onComplete: () => void;
  onCancel: () => void;
  isPending: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const eventType = booking.event_type as EventType | null;
  const Icon = eventType ? EVENT_ICON[eventType] : Sparkles;
  const colors = eventType ? EVENT_COLOR[eventType] : { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", light: "bg-muted/30" };

  return (
    <Card
      draggable={!isViewer && columnId !== "completed"}
      onDragStart={(e) => {
        e.dataTransfer.setData("bookingId", booking.id);
        e.dataTransfer.setData("fromColumn", columnId);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`overflow-hidden border ${colors.border} hover:shadow-md transition-all ${!isViewer && columnId !== "completed" ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging ? "opacity-40 scale-95" : ""}`}
    >
      {/* Coloured top strip */}
      <div className={`h-1.5 w-full ${colors.bg}`} />

      <CardContent className="p-4 space-y-3">
        {/* Event type + sub-status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`shrink-0 w-9 h-9 rounded-lg ${colors.light} flex items-center justify-center`}>
              <Icon className={`h-4.5 w-4.5 ${colors.text}`} style={{ width: 18, height: 18 }} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${colors.text} leading-tight`}>
                {eventType ? t(`banquet.eventType.${eventType}`) : "—"}
              </p>
              {columnId === "inprogress" && <SubStatusBadge status={booking.status} t={t} />}
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Key info */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {format(parseISO(booking.check_in_date), "dd MMMM yyyy", { locale: dateLocale })}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            {booking.guests_count ?? booking.num_guests} {t("banquet.card.guests")}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-foreground">{booking.guest_name}</span>
            {booking.guest_phone && <span className="truncate">{booking.guest_phone}</span>}
          </div>
        </div>

        {/* Expandable: comment + services + budget */}
        {expanded && (
          <div className="space-y-2 pt-1 border-t border-border/50">
            {booking.special_requests && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{booking.special_requests}</p>
              </div>
            )}
            {booking.budget && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t("banquet.form.budget")}:</span> {booking.budget}
              </p>
            )}
            <ServiceTags booking={booking} t={t} />
            <p className="text-[10px] text-muted-foreground/60">
              {t("bookings.booked")} {format(parseISO(booking.created_at), "dd.MM.yyyy HH:mm")}
            </p>
          </div>
        )}

        {/* Actions */}
        {!isViewer && (
          <div className="flex gap-2 pt-1">
            {columnId === "new" && (
              <>
                <Button size="sm" className="flex-1 h-7 text-xs" onClick={onAccept} disabled={isPending}>
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                  {t("banquet.action.accept")}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={onDecline} disabled={isPending}>
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}
            {columnId === "inprogress" && (
              <>
                <Button size="sm" className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onComplete} disabled={isPending}>
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3 mr-1" />}
                  {t("banquet.action.complete")}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onCancel} disabled={isPending}>
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

function BanquetColumn({
  column, bookings, t, dateLocale, isViewer, onStatusChange, isPending,
  draggingId, draggingFromCol, onDragStart, onDragEnd,
}: {
  column: typeof COLUMNS[number];
  bookings: Reservation[];
  t: (k: string) => string;
  dateLocale: any;
  isViewer: boolean;
  onStatusChange: (id: string, status: string) => void;
  isPending: boolean;
  draggingId: string | null;
  draggingFromCol: string | null;
  onDragStart: (id: string, fromCol: string) => void;
  onDragEnd: () => void;
}) {
  const ColIcon = column.icon;
  const [isDragOver, setIsDragOver] = useState(false);

  const isValidTarget = draggingFromCol !== null &&
    draggingFromCol !== column.id &&
    !(draggingFromCol === "inprogress" && column.id === "new") &&
    !(draggingFromCol === "completed") &&
    column.id !== "new";

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const bookingId = e.dataTransfer.getData("bookingId");
    const fromCol   = e.dataTransfer.getData("fromColumn");
    if (!bookingId || fromCol === column.id) return;
    let newStatus: string | null = null;
    if (fromCol === "new"        && column.id === "inprogress") newStatus = "PENDING";
    if (fromCol === "inprogress" && column.id === "completed")  newStatus = "CHECK_OUT";
    if (newStatus) onStatusChange(bookingId, newStatus);
    onDragEnd();
  };

  return (
    <div
      className={`flex flex-col min-w-0 rounded-xl transition-all duration-200 ${isDragOver && isValidTarget ? "ring-2 ring-primary/50 ring-offset-2 bg-primary/5" : ""}`}
      onDragOver={(e) => { if (isValidTarget) { e.preventDefault(); setIsDragOver(true); } }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${column.headerBg} border ${column.headerBorder} mb-4`}>
        <ColIcon className={`h-4 w-4 ${column.headerText}`} />
        <span className={`text-sm font-semibold ${column.headerText}`}>
          {t(`banquet.column.${column.id}`)}
        </span>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${column.headerBg} ${column.headerText} border ${column.headerBorder}`}>
          {bookings.length}
        </span>
      </div>

      {/* Cards */}
      <div className={`space-y-3 flex-1 rounded-xl transition-all duration-200 min-h-[80px] ${isDragOver && isValidTarget ? "border-2 border-dashed border-primary/40 p-2" : ""}`}>
        {bookings.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-12 text-center rounded-xl border-2 border-dashed ${isDragOver && isValidTarget ? "border-primary/40 bg-primary/5" : "border-border"}`}>
            <ColIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              {isDragOver && isValidTarget ? t("banquet.column.dropHere") : t("banquet.column.empty")}
            </p>
          </div>
        ) : (
          bookings.map(b => (
            <BanquetCard
              key={b.id}
              booking={b}
              columnId={column.id}
              t={t}
              dateLocale={dateLocale}
              isViewer={isViewer}
              isPending={isPending}
              isDragging={draggingId === b.id}
              onDragStart={() => onDragStart(b.id, column.id)}
              onDragEnd={onDragEnd}
              onAccept={()   => onStatusChange(b.id, "PENDING")}
              onDecline={()  => onStatusChange(b.id, "DECLINED")}
              onComplete={() => onStatusChange(b.id, "CHECK_OUT")}
              onCancel={()   => onStatusChange(b.id, "CANCELLED")}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminBanquets() {
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { isViewer } = useIsViewer();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingFromCol, setDraggingFromCol] = useState<string | null>(null);

  const { data: banquets, isLoading } = useAdminBanquets();
  const statusMutation = useAdminBanquetsMutation();

  const columns = COLUMNS.map(col => ({
    ...col,
    bookings: (banquets ?? []).filter(b => (col.statuses as readonly string[]).includes(b.status)),
  }));

  const total = banquets?.length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("banquet.admin.title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              {[1, 2].map(j => <Skeleton key={j} className="h-40 w-full rounded-xl" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("banquet.admin.title")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t("banquet.admin.subtitle")}
            {total > 0 && <span className="ml-2 font-medium text-foreground">{total} {t("banquet.admin.total")}</span>}
          </p>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => (
          <BanquetColumn
            key={col.id}
            column={col}
            bookings={col.bookings}
            t={t}
            dateLocale={dateLocale}
            isViewer={isViewer}
            isPending={statusMutation.isPending}
            draggingId={draggingId}
            draggingFromCol={draggingFromCol}
            onDragStart={(id, fromCol) => { setDraggingId(id); setDraggingFromCol(fromCol); }}
            onDragEnd={() => { setDraggingId(null); setDraggingFromCol(null); }}
            onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
          />
        ))}
      </div>
    </div>
  );
}
