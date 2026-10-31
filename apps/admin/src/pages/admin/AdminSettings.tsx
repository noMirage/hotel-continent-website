import { useState, useEffect, useMemo } from "react";
import { Save, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAdminHotelSettings, useSettingsRoomCapacity } from "@/hooks/useAdminSettingsData";
import { useAdminSettingsMutation } from "@/hooks/useAdminSettingsMutation";

export default function AdminSettings() {
  const { t } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    hotel_name: "", hotel_tagline: "", hotel_description: "",
    email: "", phone: "", address: "", address_uk: "",
    check_in_time: "", check_out_time: "", currency: "",
    tourist_tax_rate: "41.5",
    extra_capacity: "0",
  });

  const { data: settings, isLoading }    = useAdminHotelSettings();
  const { data: roomUnitsForCapacity }   = useSettingsRoomCapacity();

  // Auto-calculated main capacity from active room units
  const autoCapacity = useMemo(() => {
    if (!roomUnitsForCapacity) return 0;
    return roomUnitsForCapacity.reduce((sum, u) => sum + (u.room_type?.max_guests ?? 0), 0);
  }, [roomUnitsForCapacity]);

  const extraCapacity = parseInt(formData.extra_capacity) || 0;
  const totalCapacity = autoCapacity + extraCapacity;

  useEffect(() => {
    if (settings) {
      setFormData({
        hotel_name: settings.hotel_name || "", hotel_tagline: settings.hotel_tagline || "",
        hotel_description: settings.hotel_description || "", email: settings.email || "",
        phone: settings.phone || "", address: settings.address || "",
        address_uk: settings.address_uk || "",
        check_in_time: settings.check_in_time || "", check_out_time: settings.check_out_time || "",
        currency: settings.currency || "",
        tourist_tax_rate: String(settings.tourist_tax_rate ?? 41.5),
        extra_capacity: String(settings.extra_capacity ?? 0),
      });
    }
  }, [settings]);

  const saveMutation = useAdminSettingsMutation();

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setShowConfirm(true); };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.general")}</CardTitle>
            <CardDescription>{t("settings.generalDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hotel_name">{t("settings.hotelName")}</Label>
              <Input id="hotel_name" value={formData.hotel_name} onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotel_tagline">{t("settings.tagline")}</Label>
              <Input id="hotel_tagline" value={formData.hotel_tagline} onChange={(e) => setFormData({ ...formData, hotel_tagline: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotel_description">{t("settings.description")}</Label>
              <Textarea id="hotel_description" value={formData.hotel_description} onChange={(e) => setFormData({ ...formData, hotel_description: e.target.value })} rows={4} />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("settings.contact")}</CardTitle>
            <CardDescription>{t("settings.contactDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("settings.email")}</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("settings.phone")}</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">{t("settings.address")} (EN)</Label>
              <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Ukraine, Zakarpattia Oblast..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_uk">{t("settings.address")} (UK 🇺🇦)</Label>
              <Input id="address_uk" value={formData.address_uk} onChange={(e) => setFormData({ ...formData, address_uk: e.target.value })} placeholder="Україна, Закарпатська обл., с. Поляна..." />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("settings.booking")}</CardTitle>
            <CardDescription>{t("settings.bookingDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_in_time">{t("settings.checkInTime")}</Label>
                <Input id="check_in_time" value={formData.check_in_time} onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })} placeholder="14:00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_out_time">{t("settings.checkOutTime")}</Label>
                <Input id="check_out_time" value={formData.check_out_time} onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })} placeholder="11:00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">{t("settings.currency")}</Label>
                <Input id="currency" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} placeholder="USD" />
              </div>
            </div>

            {/* Tourist tax */}
            <div className="space-y-2">
              <Label htmlFor="tourist_tax_rate">{t("settings.touristTaxRate")}</Label>
              <Input
                id="tourist_tax_rate"
                type="number"
                min="0"
                step="0.5"
                value={formData.tourist_tax_rate}
                onChange={(e) => setFormData({ ...formData, tourist_tax_rate: e.target.value })}
                placeholder="41.5"
                className="max-w-40"
              />
              <p className="text-xs text-muted-foreground">{t("settings.touristTaxDesc")}</p>
            </div>

            {/* ── Capacity section ─────────────────────────────────────────── */}
            <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/20">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">{t("settings.capacityTitle")}</h4>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </div>

              {/* Auto-calculated from rooms */}
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">{t("settings.mainCapacity")}</Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-9 px-3 rounded-md border border-border bg-muted text-sm font-medium text-foreground min-w-[72px]">
                    {autoCapacity}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("settings.mainCapacityDesc", { count: String(roomUnitsForCapacity?.length ?? 0) })}</p>
                </div>
              </div>

              {/* Extra capacity */}
              <div className="space-y-1">
                <Label htmlFor="extra_capacity" className="text-xs">{t("settings.extraCapacity")}</Label>
                <Input
                  id="extra_capacity"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.extra_capacity}
                  onChange={(e) => setFormData({ ...formData, extra_capacity: e.target.value })}
                  placeholder="0"
                  className="max-w-40"
                />
                <p className="text-xs text-muted-foreground">{t("settings.extraCapacityDesc")}</p>
              </div>

              {/* Total */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">{t("settings.totalCapacity")}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">{totalCapacity}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("settings.totalCapacityCalc", { main: String(autoCapacity), extra: String(extraCapacity) })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("settings.saving")}</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />{t("settings.saveSettings")}</>
            )}
          </Button>
        </div>
      </form>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.confirmSave")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.confirmSaveDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("groupBookings.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowConfirm(false); saveMutation.mutate({ formData, autoCapacity, settingsId: settings?.id ?? null }); }}>
              {t("settings.confirmSaveAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
