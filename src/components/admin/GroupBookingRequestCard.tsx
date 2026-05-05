import { useState } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  Phone, Mail, Users, CalendarDays, MessageSquare,
  ArrowRightLeft, ChevronDown, ChevronUp, Check, Loader2,
  Inbox, Clock, CheckCheck, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GroupBookingRequest, GroupBookingRequestStatus } from "@/lib/supabase-types";

export const REQ_STATUS_CFG: Record<
  GroupBookingRequestStatus,
  { label_en: string; label_uk: string; cls: string; icon: React.ElementType }
> = {
  new:         { label_en: "New",         label_uk: "Нова",       cls: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200", icon: Inbox },
  in_progress: { label_en: "In Progress", label_uk: "В обробці",  cls: "bg-amber-100 text-amber-700 border-amber-200",       icon: Clock },
  resolved:    { label_en: "Resolved",    label_uk: "Вирішено",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCheck },
  declined:    { label_en: "Declined",    label_uk: "Відхилено",  cls: "bg-red-100 text-red-700 border-red-200",             icon: Ban },
};

export function ReqStatusBadge({ status, lang }: { status: GroupBookingRequestStatus; lang: "en" | "uk" }) {
  const cfg  = REQ_STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {lang === "uk" ? cfg.label_uk : cfg.label_en}
    </span>
  );
}

interface Props {
  req: GroupBookingRequest;
  lang: "en" | "uk";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dateLocale: any;
  isViewer: boolean;
  onSave: (id: string, status: GroupBookingRequestStatus, notes: string) => void;
  isSaving: boolean;
  onConvert: (req: GroupBookingRequest) => void;
}

export function GroupBookingRequestCard({
  req, lang, dateLocale, isViewer, onSave, isSaving, onConvert,
}: Props) {
  const [expanded,   setExpanded]   = useState(false);
  const [status,     setStatus]     = useState<GroupBookingRequestStatus>(req.status);
  const [adminNotes, setAdminNotes] = useState(req.admin_notes ?? "");

  const nights = differenceInDays(parseISO(req.check_out), parseISO(req.check_in));

  return (
    <Card className="overflow-hidden border border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">{req.guest_name}</span>
              <ReqStatusBadge status={req.status} lang={lang} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />{req.guest_phone}
              </span>
              {req.guest_email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />{req.guest_email}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {req.num_guests} {lang === "uk" ? "гостей" : "guests"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(parseISO(req.check_in), "dd MMM yyyy", { locale: dateLocale })}
              {" – "}
              {format(parseISO(req.check_out), "dd MMM yyyy", { locale: dateLocale })}
              <span className="text-xs opacity-60">
                ({nights} {lang === "uk"
                  ? (nights === 1 ? "ніч" : nights < 5 ? "ночі" : "ночей")
                  : nights === 1 ? "night" : "nights"})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isViewer && req.status !== "resolved" && req.status !== "declined" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                onClick={() => onConvert(req)}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                {lang === "uk" ? "Бронювання" : "Convert"}
              </Button>
            )}
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {req.wishes && !expanded && (
          <p className="text-sm text-muted-foreground italic line-clamp-2 flex items-start gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {req.wishes}
          </p>
        )}

        {expanded && (
          <div className="border-t pt-3 space-y-3">
            {req.wishes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {lang === "uk" ? "Побажання гостя" : "Guest wishes"}
                </p>
                <p className="text-sm text-foreground bg-muted/50 rounded p-2">{req.wishes}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {lang === "uk" ? "Надіслано" : "Submitted"}:{" "}
              {format(parseISO(req.created_at), "dd MMM yyyy, HH:mm", { locale: dateLocale })}
            </p>

            {!isViewer && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">{lang === "uk" ? "Статус" : "Status"}</Label>
                  <Select value={status} onValueChange={v => setStatus(v as GroupBookingRequestStatus)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(REQ_STATUS_CFG) as [GroupBookingRequestStatus, typeof REQ_STATUS_CFG[GroupBookingRequestStatus]][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{lang === "uk" ? v.label_uk : v.label_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{lang === "uk" ? "Нотатки адміна" : "Admin notes"}</Label>
                  <Textarea
                    rows={2}
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder={lang === "uk" ? "Внутрішня нотатка…" : "Internal note…"}
                    className="text-sm"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => onSave(req.id, status, adminNotes)}
                    disabled={isSaving}
                    className="gap-1"
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {lang === "uk" ? "Зберегти" : "Save"}
                  </Button>
                  {req.status !== "resolved" && req.status !== "declined" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => onConvert(req)}
                      disabled={isSaving}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      {lang === "uk" ? "Створити бронювання" : "Convert to Booking"}
                    </Button>
                  )}
                </div>
              </>
            )}

            {isViewer && req.admin_notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {lang === "uk" ? "Нотатки адміна" : "Admin notes"}
                </p>
                <p className="text-sm text-foreground bg-muted/50 rounded p-2">{req.admin_notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
