import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { exportGuestFormDocx } from "@/lib/export-guest-form-docx";
import { GuestFormDialog } from "@/components/admin/GuestFormDialog";
import type { Reservation, GuestForm } from "@/lib/supabase-types";
import { QK } from "@/lib/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { format } from "date-fns";
import { fromLocalDateString } from "@/lib/date-utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation;
}

function formatDate(dateStr: string): string {
  try {
    return format(fromLocalDateString(dateStr), "dd.MM.yyyy");
  } catch {
    return dateStr;
  }
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value?.trim() || "—"}</p>
    </div>
  );
}

export function ViewGuestFormDialog({ open, onOpenChange, reservation }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [editingForm, setEditingForm] = useState<GuestForm | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: forms, isLoading } = useQuery<GuestForm[]>({
    queryKey: QK.guestFormsView(reservation.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_forms")
        .select("*")
        .eq("reservation_id", reservation.id)
        .order("guest_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GuestForm[];
    },
    enabled: open,
  });

  async function handleExport() {
    if (!forms || forms.length === 0) return;
    setIsExporting(true);
    try {
      await exportGuestFormDocx(forms, reservation);
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }

  const isMultiple = (forms?.length ?? 0) > 1;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("bookings.checkInForm")}</DialogTitle>
            <DialogDescription>
              {reservation.guest_name} · {formatDate(reservation.check_in_date)} – {formatDate(reservation.check_out_date)}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !forms || forms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("bookings.noGuestForm")}</p>
          ) : (
            <div className="space-y-6">
              {forms.map((form, idx) => (
                <div key={form.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    {isMultiple && (
                      <p className="font-semibold text-sm text-primary">
                        {t("bookings.guestN", { n: String(idx + 1) })}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      onClick={() => setEditingForm(form)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      {t("bookings.editForm")}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t("guestForm.fullName")} value={form.full_name} />
                    <Field label={t("guestForm.dateOfBirth")} value={formatDate(form.date_of_birth)} />
                    <Field label={t("guestForm.country")} value={form.country_of_residence} />
                    <Field label={t("guestForm.region")} value={form.region} />
                    <Field label={t("guestForm.district")} value={form.district} />
                    <Field label={t("guestForm.villageCity")} value={form.village_city} />
                  </div>

                  <Field label={t("guestForm.streetHouseApt")} value={form.street_house_apartment} />

                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t("guestForm.passportSeries")} value={form.passport_series} />
                    <Field label={t("guestForm.issuedBy")} value={form.issued_by} />
                    {form.ubk && <Field label={t("guestForm.ubk")} value={form.ubk} />}
                    <Field label={t("guestForm.phone")} value={form.phone_number} />
                    {form.vehicle_number && (
                      <Field label={t("guestForm.vehicleNumber")} value={form.vehicle_number} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleExport}
              disabled={isLoading || !forms || forms.length === 0 || isExporting}
              className="flex-1"
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? t("guestForm.submitting") : t("bookings.exportDocx")}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("guestForm.cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit form dialog */}
      {editingForm && (
        <GuestFormDialog
          open={!!editingForm}
          onOpenChange={(o) => { if (!o) setEditingForm(null); }}
          reservation={reservation}
          existingForm={editingForm}
        />
      )}
    </>
  );
}
