import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, ChevronDown, ChevronUp, Loader2, Phone, Mail, Calendar, Inbox, Clock, CheckCheck, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PromoApplication, PromoApplicationStatus } from "@/lib/supabase-types";

export type AppStatus = PromoApplicationStatus;

export const STATUS_CONFIG: Record<AppStatus, { label_en: string; label_uk: string; icon: React.ElementType; cls: string }> = {
  new:         { label_en: "New",         label_uk: "Нова",       icon: Inbox,      cls: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" },
  in_progress: { label_en: "In progress", label_uk: "В обробці",  icon: Clock,      cls: "bg-amber-100 text-amber-700 border-amber-200" },
  resolved:    { label_en: "Resolved",    label_uk: "Вирішено",   icon: CheckCheck, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  declined:    { label_en: "Declined",    label_uk: "Відхилено",  icon: Ban,        cls: "bg-red-100 text-red-700 border-red-200" },
};

export function StatusBadge({ status, lang }: { status: AppStatus; lang: "en" | "uk" }) {
  const cfg  = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {lang === "uk" ? cfg.label_uk : cfg.label_en}
    </span>
  );
}

interface Props {
  app: PromoApplication;
  lang: "en" | "uk";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dateLocale: any;
  isViewer: boolean;
  onSave: (id: string, status: AppStatus, feedback: string) => void;
  isSaving: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function KanbanAppCard({
  app, lang, dateLocale, isViewer, onSave, isSaving, onDragStart, onDragEnd, isDragging,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(app.admin_feedback ?? "");

  return (
    <Card
      draggable={!isViewer}
      onDragStart={(e) => {
        e.dataTransfer.setData("appId", app.id);
        e.dataTransfer.setData("fromStatus", app.status);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`overflow-hidden border border-border hover:shadow-md transition-all
        ${!isViewer ? "cursor-grab active:cursor-grabbing" : ""}
        ${isDragging ? "opacity-40 scale-95" : ""}`}
    >
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <span className="font-semibold text-sm text-foreground leading-tight">{app.guest_name}</span>
            {app.promotion_title && (
              <p className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full inline-block">
                {app.promotion_title}
              </p>
            )}
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Phone className="h-3 w-3" />{app.guest_phone}
          </span>
          {app.guest_email && (
            <span className="flex items-center gap-1.5">
              <Mail className="h-3 w-3" />{app.guest_email}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {format(parseISO(app.created_at), "dd MMM yyyy", { locale: dateLocale })}
          </span>
        </div>

        {app.comment && !expanded && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">"{app.comment}"</p>
        )}

        {expanded && (
          <div className="border-t pt-2.5 space-y-2.5">
            {app.comment && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1">
                  {lang === "uk" ? "Коментар клієнта" : "Client comment"}
                </p>
                <p className="text-xs text-foreground bg-muted/50 rounded p-2">{app.comment}</p>
              </div>
            )}
            {!isViewer && (
              <>
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    {lang === "uk" ? "Відповідь адміністратора" : "Admin feedback"}
                  </Label>
                  <Textarea
                    rows={3}
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder={lang === "uk" ? "Залиште нотатку або відповідь на заявку…" : "Leave a note or response…"}
                    className="text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs w-full"
                  onClick={() => onSave(app.id, app.status, feedback)}
                  disabled={isSaving}
                >
                  {isSaving
                    ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    : <Check className="h-3 w-3 mr-1" />}
                  {lang === "uk" ? "Зберегти відповідь" : "Save feedback"}
                </Button>
              </>
            )}
            {isViewer && app.admin_feedback && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1">
                  {lang === "uk" ? "Відповідь адміністратора" : "Admin feedback"}
                </p>
                <p className="text-xs text-foreground bg-muted/50 rounded p-2">{app.admin_feedback}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
