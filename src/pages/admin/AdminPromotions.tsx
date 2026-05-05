import { useState } from "react";
import { format, parseISO } from "date-fns";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { Plus, Pencil, Trash2, Tag, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIsViewer } from "@/hooks/useUserRole";
import type { Promotion } from "@/lib/supabase-types";
import { useAdminPromotions, usePromoApplications } from "@/hooks/usePromotionsData";
import { usePromotionsMutations } from "@/hooks/usePromotionsMutations";
import { KanbanAppColumn, APP_COLUMNS } from "@/components/admin/KanbanAppColumn";
import { PromotionFormDialog } from "@/components/admin/PromotionFormDialog";
import type { AppStatus } from "@/components/admin/KanbanAppCard";

export default function AdminPromotions() {
  const { language } = useLanguage();
  const { isViewer } = useIsViewer();
  const lang       = language as "en" | "uk";
  const dateLocale = lang === "uk" ? ukLocale : enUS;

  // ── Dialog / selection state ────────────────────────────────────────────────
  const [promoDialog, setPromoDialog] = useState<{ open: boolean; editing: Promotion | null }>({
    open: false, editing: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  // ── Kanban state ────────────────────────────────────────────────────────────
  const [filterPromo,        setFilterPromo]        = useState<string>("all");
  const [savingId,           setSavingId]           = useState<string | null>(null);
  const [draggingId,         setDraggingId]         = useState<string | null>(null);
  const [draggingFromStatus, setDraggingFromStatus] = useState<AppStatus | null>(null);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: promotions,   isLoading: loadingPromos } = useAdminPromotions();
  const { data: applications, isLoading: loadingApps  } = usePromoApplications();

  // ── Mutations ───────────────────────────────────────────────────────────────
  const { saveMutation, deleteMutation, toggleActiveMutation, updateAppMutation } = usePromotionsMutations({
    onSaveSuccess:   () => setPromoDialog({ open: false, editing: null }),
    onDeleteSuccess: () => setDeleteTarget(null),
    onAppUpdated:    () => setSavingId(null),
  });

  // ── Derived ─────────────────────────────────────────────────────────────────
  const newCount = applications?.filter(a => a.status === "new").length ?? 0;
  const counts = {
    total:       applications?.length ?? 0,
    new:         newCount,
    in_progress: applications?.filter(a => a.status === "in_progress").length ?? 0,
    resolved:    applications?.filter(a => a.status === "resolved").length ?? 0,
  };
  const filtered = (applications ?? []).filter(a =>
    filterPromo === "all" || a.promotion_id === filterPromo
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSaveApp = (id: string, status: AppStatus, feedback: string) => {
    setSavingId(id);
    updateAppMutation.mutate({ id, status, admin_feedback: feedback });
  };

  const handleDrop = (appId: string, toStatus: AppStatus) => {
    const app = (applications ?? []).find(a => a.id === appId);
    if (!app || app.status === toStatus) return;
    updateAppMutation.mutate({ id: appId, status: toStatus, admin_feedback: app.admin_feedback ?? "" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-foreground">
          {lang === "uk" ? "Акції та заявки" : "Promotions & Applications"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {lang === "uk"
            ? "Управляйте акційними пропозиціями та заявками від клієнтів"
            : "Manage promotional offers and customer applications"}
        </p>
      </div>

      <Tabs defaultValue="promotions">
        <TabsList>
          <TabsTrigger value="promotions" className="gap-2">
            <Tag className="h-4 w-4" />
            {lang === "uk" ? "Акції" : "Promotions"}
            {promotions && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{promotions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="applications" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            {lang === "uk" ? "Заявки" : "Applications"}
            {newCount > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs bg-fuchsia-500 text-white">{newCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Promotions tab ──────────────────────────────────────────────── */}
        <TabsContent value="promotions" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {lang === "uk" ? `${promotions?.length ?? 0} акцій` : `${promotions?.length ?? 0} promotion(s)`}
            </p>
            {!isViewer && (
              <Button size="sm" onClick={() => setPromoDialog({ open: true, editing: null })} className="gap-2">
                <Plus className="h-4 w-4" />
                {lang === "uk" ? "Нова акція" : "New Promotion"}
              </Button>
            )}
          </div>

          {loadingPromos ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
          ) : !promotions?.length ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
              <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{lang === "uk" ? "Акцій ще немає" : "No promotions yet"}</p>
              {!isViewer && (
                <Button size="sm" variant="outline" className="mt-4 gap-1"
                  onClick={() => setPromoDialog({ open: true, editing: null })}>
                  <Plus className="h-3.5 w-3.5" />
                  {lang === "uk" ? "Створити першу" : "Create first"}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {promotions.map(promo => {
                const title = (lang === "uk" && promo.title_uk) ? promo.title_uk : promo.title;
                const badge = (lang === "uk" && promo.badge_uk) ? promo.badge_uk : promo.badge;
                return (
                  <Card key={promo.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{title}</span>
                            {badge && (
                              <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                                {badge}
                              </span>
                            )}
                            {promo.discount_percent > 0 && (
                              <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                                −{promo.discount_percent}%
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${promo.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                              {promo.is_active
                                ? (lang === "uk" ? "Активна" : "Active")
                                : (lang === "uk" ? "Неактивна" : "Inactive")}
                            </span>
                          </div>
                          {(promo.valid_from || promo.valid_to) && (
                            <p className="text-xs text-muted-foreground">
                              {promo.valid_from && format(parseISO(promo.valid_from), "dd.MM.yyyy")}
                              {promo.valid_from && promo.valid_to && " – "}
                              {promo.valid_to && format(parseISO(promo.valid_to), "dd.MM.yyyy")}
                            </p>
                          )}
                          {promo.highlights.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {promo.highlights.length} {lang === "uk" ? "переваг" : "highlight(s)"}
                            </p>
                          )}
                        </div>
                        {!isViewer && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Switch
                              checked={promo.is_active}
                              onCheckedChange={checked =>
                                toggleActiveMutation.mutate({ id: promo.id, is_active: checked })
                              }
                            />
                            <Button size="icon" variant="ghost"
                              onClick={() => setPromoDialog({ open: true, editing: promo })}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(promo)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Applications tab (kanban) ───────────────────────────────────── */}
        <TabsContent value="applications" className="mt-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { label_en: "Total",       label_uk: "Всього",    value: counts.total,       cls: "bg-muted" },
              { label_en: "New",         label_uk: "Нових",     value: counts.new,         cls: "bg-fuchsia-50 border-fuchsia-200" },
              { label_en: "In progress", label_uk: "В обробці", value: counts.in_progress, cls: "bg-amber-50 border-amber-200" },
              { label_en: "Resolved",    label_uk: "Вирішено",  value: counts.resolved,    cls: "bg-emerald-50 border-emerald-200" },
            ] as const).map(s => (
              <Card key={s.label_en} className={`border ${s.cls}`}>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{lang === "uk" ? s.label_uk : s.label_en}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Select value={filterPromo} onValueChange={setFilterPromo}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder={lang === "uk" ? "Всі акції" : "All promotions"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "uk" ? "Всі акції" : "All promotions"}</SelectItem>
                {(promotions ?? []).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {(lang === "uk" && p.title_uk) ? p.title_uk : p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterPromo !== "all" && (
              <Button size="sm" variant="ghost" onClick={() => setFilterPromo("all")} className="gap-1 text-xs">
                <X className="h-3 w-3" />{lang === "uk" ? "Скинути" : "Clear"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground ml-auto">
              {lang === "uk" ? "Перетягніть картку щоб змінити статус" : "Drag a card to change its status"}
            </p>
          </div>

          {loadingApps ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  {[1, 2].map(j => <Skeleton key={j} className="h-32 w-full rounded-xl" />)}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {APP_COLUMNS.map(col => (
                <KanbanAppColumn
                  key={col.id}
                  col={col}
                  apps={filtered.filter(a => a.status === col.id)}
                  lang={lang}
                  dateLocale={dateLocale}
                  isViewer={isViewer}
                  onSave={handleSaveApp}
                  savingId={savingId}
                  draggingId={draggingId}
                  draggingFromStatus={draggingFromStatus}
                  onDragStart={(id, fromStatus) => {
                    setDraggingId(id);
                    setDraggingFromStatus(fromStatus);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDraggingFromStatus(null);
                  }}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Create / Edit promotion dialog ──────────────────────────────────── */}
      <PromotionFormDialog
        open={promoDialog.open}
        editing={promoDialog.editing}
        saveMutation={saveMutation}
        onClose={() => setPromoDialog({ open: false, editing: null })}
        lang={lang}
      />

      {/* ── Delete confirm ───────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "uk" ? "Видалити акцію?" : "Delete promotion?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "uk"
                ? `«${deleteTarget ? ((lang === "uk" && deleteTarget.title_uk) ? deleteTarget.title_uk : deleteTarget.title) : ""}» буде видалено. Цю дію неможливо скасувати.`
                : `"${deleteTarget?.title}" will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "uk" ? "Скасувати" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {lang === "uk" ? "Видалити" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
