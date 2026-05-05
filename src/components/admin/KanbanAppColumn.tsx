import { useState } from "react";
import { Inbox, Clock, CheckCheck, Ban } from "lucide-react";
import type { PromoApplication } from "@/lib/supabase-types";
import { KanbanAppCard, type AppStatus } from "./KanbanAppCard";

export const APP_COLUMNS = [
  {
    id:           "new"         as AppStatus,
    label_en:     "New",
    label_uk:     "Нова",
    headerBg:     "bg-fuchsia-50",
    headerBorder: "border-fuchsia-200",
    headerText:   "text-fuchsia-800",
    emptyBorder:  "border-fuchsia-200",
    icon:         Inbox,
  },
  {
    id:           "in_progress" as AppStatus,
    label_en:     "In Progress",
    label_uk:     "В обробці",
    headerBg:     "bg-amber-50",
    headerBorder: "border-amber-200",
    headerText:   "text-amber-800",
    emptyBorder:  "border-amber-200",
    icon:         Clock,
  },
  {
    id:           "resolved"    as AppStatus,
    label_en:     "Resolved",
    label_uk:     "Вирішено",
    headerBg:     "bg-emerald-50",
    headerBorder: "border-emerald-200",
    headerText:   "text-emerald-800",
    emptyBorder:  "border-emerald-200",
    icon:         CheckCheck,
  },
  {
    id:           "declined"    as AppStatus,
    label_en:     "Declined",
    label_uk:     "Відхилено",
    headerBg:     "bg-red-50",
    headerBorder: "border-red-200",
    headerText:   "text-red-800",
    emptyBorder:  "border-red-200",
    icon:         Ban,
  },
] as const;

interface Props {
  col: typeof APP_COLUMNS[number];
  apps: PromoApplication[];
  lang: "en" | "uk";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dateLocale: any;
  isViewer: boolean;
  onSave: (id: string, status: AppStatus, feedback: string) => void;
  savingId: string | null;
  draggingId: string | null;
  draggingFromStatus: AppStatus | null;
  onDragStart: (id: string, fromStatus: AppStatus) => void;
  onDragEnd: () => void;
  onDrop: (appId: string, toStatus: AppStatus) => void;
}

export function KanbanAppColumn({
  col, apps, lang, dateLocale, isViewer,
  onSave, savingId, draggingId, draggingFromStatus,
  onDragStart, onDragEnd, onDrop,
}: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const ColIcon = col.icon;
  const isValidTarget = draggingFromStatus !== null && draggingFromStatus !== col.id;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const appId      = e.dataTransfer.getData("appId");
    const fromStatus = e.dataTransfer.getData("fromStatus") as AppStatus;
    if (!appId || fromStatus === col.id) return;
    onDrop(appId, col.id);
    onDragEnd();
  };

  return (
    <div
      className={`flex flex-col min-w-0 rounded-xl transition-all duration-200
        ${isDragOver && isValidTarget ? "ring-2 ring-primary/50 ring-offset-2 bg-primary/5" : ""}`}
      onDragOver={(e) => { if (isValidTarget) { e.preventDefault(); setIsDragOver(true); } }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${col.headerBg} border ${col.headerBorder} mb-3`}>
        <ColIcon className={`h-4 w-4 ${col.headerText}`} />
        <span className={`text-sm font-semibold ${col.headerText}`}>
          {lang === "uk" ? col.label_uk : col.label_en}
        </span>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${col.headerBg} ${col.headerText} border ${col.headerBorder}`}>
          {apps.length}
        </span>
      </div>

      <div className={`space-y-3 flex-1 rounded-xl transition-all duration-200 min-h-[80px]
        ${isDragOver && isValidTarget ? "border-2 border-dashed border-primary/40 p-2" : ""}`}>
        {apps.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-10 text-center rounded-xl border-2 border-dashed
            ${isDragOver && isValidTarget
              ? "border-primary/40 bg-primary/5"
              : `${col.emptyBorder} border-opacity-50`}`}>
            <ColIcon className="h-7 w-7 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              {isDragOver && isValidTarget
                ? (lang === "uk" ? "Перетягніть сюди" : "Drop here")
                : (lang === "uk" ? "Немає заявок" : "No applications")}
            </p>
          </div>
        ) : (
          apps.map(app => (
            <KanbanAppCard
              key={app.id}
              app={app}
              lang={lang}
              dateLocale={dateLocale}
              isViewer={isViewer}
              onSave={onSave}
              isSaving={savingId === app.id}
              isDragging={draggingId === app.id}
              onDragStart={() => onDragStart(app.id, app.status)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}
