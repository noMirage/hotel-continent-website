import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { RoomType } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";
import { useIsSuperAdmin } from "@/hooks/useUserRole";
import { useLanguage } from "@/i18n/LanguageContext";
import { useRoomUnitsMutations, type RoomUnitFormState } from "@/hooks/useRoomUnitsMutations";

interface RoomUnitWithType {
  id: string;
  room_type_id: string;
  room_number: string;
  floor: number | null;
  notes: string | null;
  is_active: boolean;
  bed_config: "double_bed" | "twin_beds" | null;
  extra_accommodation_enabled: boolean;
  extra_accommodation_max: number;
  created_at: string;
  updated_at: string;
  room_type: { id: string; name: string; name_uk: string | null } | null;
}

const EMPTY_FORM: RoomUnitFormState = {
  room_type_id: "",
  room_number: "",
  floor: "",
  notes: "",
  is_active: true,
  bed_config: "none",
  extra_accommodation_enabled: false,
  extra_accommodation_max: "0",
};

interface CalendarRoomManagerProps {
  onClose?: () => void;
}

export function CalendarRoomManager({ onClose }: CalendarRoomManagerProps) {
  const { t } = useLanguage();
  const { isSuperAdmin } = useIsSuperAdmin();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<RoomUnitWithType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoomUnitWithType | null>(null);
  const [form, setForm] = useState<RoomUnitFormState>(EMPTY_FORM);

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { language } = useLanguage();

  const { data: roomUnits, isLoading } = useQuery({
    queryKey: QK.roomManagerUnits(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_units")
        .select("*, room_type:room_types(id, name, name_uk)")
        .order("room_number");
      if (error) throw error;
      return data as RoomUnitWithType[];
    },
  });

  const { data: roomTypes } = useQuery({
    queryKey: QK.roomTypesForManager(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_types").select("id, name, name_uk").order("sort_order");
      if (error) throw error;
      return data as Pick<RoomType, "id" | "name" | "name_uk">[];
    },
  });

  const rtLabel = (rt: { name: string; name_uk?: string | null }) =>
    language === "uk" ? (rt.name_uk || rt.name) : rt.name;

  // ── Mutations ────────────────────────────────────────────────────────────────

  const { saveMutation, deleteMutation, deactivateMutation } = useRoomUnitsMutations({
    onSaveSuccess: () => setDialogOpen(false),
    onDeleteSuccess: () => setDeleteTarget(null),
    onDeactivateSuccess: () => setDeleteTarget(null),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditingUnit(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(unit: RoomUnitWithType) {
    setEditingUnit(unit);
    setForm({
      room_type_id: unit.room_type_id,
      room_number: unit.room_number,
      floor: unit.floor ? String(unit.floor) : "",
      notes: unit.notes ?? "",
      is_active: unit.is_active ?? true,
      bed_config: unit.bed_config ?? "none",
      extra_accommodation_enabled: unit.extra_accommodation_enabled ?? false,
      extra_accommodation_max: String(unit.extra_accommodation_max ?? 0),
    });
    setDialogOpen(true);
  }

  const isFormValid = form.room_type_id && form.room_number.trim();

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{t("roomManager.title")}</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> {t("roomManager.addRoom")}
          </Button>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("roomManager.loading")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 pr-4">{t("roomManager.number")}</th>
                <th className="text-left py-2 pr-4">{t("roomManager.type")}</th>
                <th className="text-left py-2 pr-4">{t("roomManager.floor")}</th>
                <th className="text-left py-2 pr-4">{t("roomManager.bedConfig")}</th>
                <th className="text-left py-2 pr-4">{t("roomManager.status")}</th>
                <th className="text-right py-2">{t("users.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {roomUnits?.map((unit) => (
                <tr key={unit.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="py-2 pr-4 font-medium">{unit.room_number}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{unit.room_type ? rtLabel(unit.room_type) : "—"}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{unit.floor ?? "—"}</td>
                  <td className="py-2 pr-4 text-muted-foreground text-xs">
                    {unit.bed_config === "double_bed"   ? t("roomManager.doubleBed") :
                     unit.bed_config === "twin_beds"    ? t("roomManager.twinBeds") :
                     unit.bed_config === "double_bed_sofa" ? t("roomManager.doubleBedSofa") :
                     unit.bed_config === "triple_single" ? t("roomManager.tripleSingle") :
                     unit.bed_config === "quad_single"   ? t("roomManager.quadSingle") : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant={unit.is_active ? "default" : "secondary"}>
                      {unit.is_active ? t("roomManager.active") : t("roomManager.inactive")}
                    </Badge>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(unit)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {isSuperAdmin && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(unit)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!roomUnits?.length && (
                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">{t("roomManager.noRooms")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingUnit ? t("roomManager.editTitle") : t("roomManager.addTitle")}</DialogTitle>
            <DialogDescription>{editingUnit ? t("roomManager.editDesc") : t("roomManager.addDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("roomManager.type")} *</Label>
              <Select value={form.room_type_id} onValueChange={v => setForm(f => ({ ...f, room_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t("manualBooking.selectRoomType")} /></SelectTrigger>
                <SelectContent>
                  {roomTypes?.map(rt => <SelectItem key={rt.id} value={rt.id}>{rtLabel(rt)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("roomManager.number")} *</Label>
              <Input value={form.room_number} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} placeholder="101" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("roomManager.floor")}</Label>
              <Input type="number" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("roomManager.bedConfig")}</Label>
              <Select value={form.bed_config || "none"} onValueChange={v => setForm(f => ({ ...f, bed_config: v }))}>
                <SelectTrigger><SelectValue placeholder={t("roomManager.bedConfigAny")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("roomManager.bedConfigAny")}</SelectItem>
                  <SelectItem value="double_bed">{t("roomManager.doubleBed")}</SelectItem>
                  <SelectItem value="twin_beds">{t("roomManager.twinBeds")}</SelectItem>
                  <SelectItem value="double_bed_sofa">{t("roomManager.doubleBedSofa")}</SelectItem>
                  <SelectItem value="triple_single">{t("roomManager.tripleSingle")}</SelectItem>
                  <SelectItem value="quad_single">{t("roomManager.quadSingle")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("adminRooms.amenities")}</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={t("roomManager.notesPlaceholder")} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} id="rm-active" />
              <Label htmlFor="rm-active">{t("adminRooms.active")}</Label>
            </div>
            {/* Extra accommodation */}
            <div className="rounded-md border border-border p-3 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.extra_accommodation_enabled}
                  onCheckedChange={v => setForm(f => ({ ...f, extra_accommodation_enabled: v, extra_accommodation_max: v ? f.extra_accommodation_max : "0" }))}
                  id="rm-extra-accom"
                />
                <Label htmlFor="rm-extra-accom" className="text-sm">{t("roomManager.extraAccomEnabled")}</Label>
              </div>
              {form.extra_accommodation_enabled && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("roomManager.extraAccomMax")}</Label>
                  <Input
                    type="number" min={1} step={1}
                    value={form.extra_accommodation_max}
                    onChange={e => setForm(f => ({ ...f, extra_accommodation_max: e.target.value }))}
                    placeholder="1"
                    className="max-w-24 h-8"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("adminRooms.cancel")}</Button>
            <Button disabled={!isFormValid || saveMutation.isPending} onClick={() => saveMutation.mutate({ form, editingUnitId: editingUnit?.id ?? null })}>
              {saveMutation.isPending ? t("adminRooms.save") : editingUnit ? t("roomManager.save") : t("roomManager.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roomManager.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("roomManager.deleteDesc")} &ldquo;{deleteTarget?.room_number}&rdquo;
              <span className="block mt-2 text-xs text-muted-foreground">
                {t("roomManager.deleteHasReservationsHint")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>{t("adminRooms.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => deleteTarget && deactivateMutation.mutate(deleteTarget.id)}
              disabled={deactivateMutation.isPending}>
              {t("roomManager.deactivateInstead")}
            </AlertDialogAction>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}>
              {t("adminRooms.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
