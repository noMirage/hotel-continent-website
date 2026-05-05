import { useState, useEffect } from "react";
import { useGuestFormMutation, type GuestFormEntry } from "@/hooks/useGuestFormMutation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Reservation, GuestForm } from "@/lib/supabase-types";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";

// ─── Countries ────────────────────────────────────────────────────────────────

const COUNTRIES: string[] = [
  "Україна",
  "Albania", "Andorra", "Austria", "Belarus", "Belgium",
  "Bosnia and Herzegovina", "Bulgaria", "Croatia", "Cyprus",
  "Czech Republic", "Denmark", "Estonia", "Finland", "France",
  "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy",
  "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg",
  "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands",
  "North Macedonia", "Norway", "Poland", "Portugal", "Romania",
  "Russia", "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain",
  "Sweden", "Switzerland", "Turkey", "United Kingdom", "Vatican City",
  "United States",
  "Canada", "Australia", "New Zealand", "Japan", "South Korea",
  "China", "India", "Israel", "Saudi Arabia", "UAE",
  "Other",
];

const COUNTRY_NAMES_UK: Record<string, string> = {
  "Україна": "Україна",
  "Albania": "Албанія",
  "Andorra": "Андорра",
  "Austria": "Австрія",
  "Belarus": "Білорусь",
  "Belgium": "Бельгія",
  "Bosnia and Herzegovina": "Боснія і Герцеговина",
  "Bulgaria": "Болгарія",
  "Croatia": "Хорватія",
  "Cyprus": "Кіпр",
  "Czech Republic": "Чехія",
  "Denmark": "Данія",
  "Estonia": "Естонія",
  "Finland": "Фінляндія",
  "France": "Франція",
  "Germany": "Німеччина",
  "Greece": "Греція",
  "Hungary": "Угорщина",
  "Iceland": "Ісландія",
  "Ireland": "Ірландія",
  "Italy": "Італія",
  "Kosovo": "Косово",
  "Latvia": "Латвія",
  "Liechtenstein": "Ліхтенштейн",
  "Lithuania": "Литва",
  "Luxembourg": "Люксембург",
  "Malta": "Мальта",
  "Moldova": "Молдова",
  "Monaco": "Монако",
  "Montenegro": "Чорногорія",
  "Netherlands": "Нідерланди",
  "North Macedonia": "Північна Македонія",
  "Norway": "Норвегія",
  "Poland": "Польща",
  "Portugal": "Португалія",
  "Romania": "Румунія",
  "Russia": "Росія",
  "San Marino": "Сан-Марино",
  "Serbia": "Сербія",
  "Slovakia": "Словаччина",
  "Slovenia": "Словенія",
  "Spain": "Іспанія",
  "Sweden": "Швеція",
  "Switzerland": "Швейцарія",
  "Turkey": "Туреччина",
  "United Kingdom": "Велика Британія",
  "Vatican City": "Ватикан",
  "United States": "США",
  "Canada": "Канада",
  "Australia": "Австралія",
  "New Zealand": "Нова Зеландія",
  "Japan": "Японія",
  "South Korea": "Південна Корея",
  "China": "Китай",
  "India": "Індія",
  "Israel": "Ізраїль",
  "Saudi Arabia": "Саудівська Аравія",
  "UAE": "ОАЕ",
  "Other": "Інше",
};

// ─── Regions ──────────────────────────────────────────────────────────────────

const UKRAINE_OBLASTS: string[] = [
  "Вінницька область", "Волинська область", "Дніпропетровська область",
  "Донецька область", "Житомирська область", "Закарпатська область",
  "Запорізька область", "Івано-Франківська область", "Київська область",
  "м. Київ", "Кіровоградська область", "Луганська область", "Львівська область",
  "Миколаївська область", "Одеська область", "Полтавська область",
  "Рівненська область", "Сумська область", "Тернопільська область",
  "Харківська область", "Херсонська область", "Хмельницька область",
  "Черкаська область", "Чернівецька область", "Чернігівська область",
];

const US_STATES: string[] = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  "Україна": UKRAINE_OBLASTS,
  "United States": US_STATES,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation;
  /** When provided the dialog operates in edit mode (updating existing guest_form) */
  existingForm?: GuestForm | null;
  /** When filling forms room-by-room in a multi-room group check-in */
  roomInfo?: { index: number; total: number; label?: string };
  /** Called after a successful save (before onOpenChange(false)) */
  onSuccess?: () => void;
}

const EMPTY_FORM: GuestFormEntry = {
  full_name: "",
  date_of_birth: "",
  country_of_residence: "",
  region: "",
  district: "",
  village_city: "",
  street_house_apartment: "",
  passport_series: "",
  issued_by: "",
  ubk: "",
  phone_number: "",
  vehicle_number: "",
};

function formFromExisting(g: GuestForm): GuestFormEntry {
  return {
    full_name: g.full_name,
    date_of_birth: g.date_of_birth,
    country_of_residence: g.country_of_residence ?? "",
    region: g.region ?? "",
    district: g.district ?? "",
    village_city: g.village_city ?? "",
    street_house_apartment: g.street_house_apartment ?? "",
    passport_series: g.passport_series ?? "",
    issued_by: g.issued_by ?? "",
    ubk: g.ubk ?? "",
    phone_number: g.phone_number ?? "",
    vehicle_number: g.vehicle_number ?? "",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GuestFormDialog({ open, onOpenChange, reservation, existingForm, roomInfo, onSuccess }: GuestFormDialogProps) {
  const { t, language } = useLanguage();
  const { data: hotelSettings } = useHotelSettings();
  const isEditMode = !!existingForm;

  const totalGuests = isEditMode ? 1 : reservation.num_guests;
  const [currentGuestIdx, setCurrentGuestIdx] = useState(0);
  const [forms, setForms] = useState<GuestFormEntry[]>([{ ...EMPTY_FORM }]);
  const [errors, setErrors] = useState<Partial<Record<keyof GuestFormEntry, string>>>({});

  const form = forms[currentGuestIdx] ?? EMPTY_FORM;
  const isLastGuest = currentGuestIdx === totalGuests - 1;
  const isMultiGuest = totalGuests > 1;

  useEffect(() => {
    if (open) {
      if (existingForm) {
        setForms([formFromExisting(existingForm)]);
      } else {
        setForms(Array.from({ length: reservation.num_guests }, () => ({ ...EMPTY_FORM })));
      }
      setCurrentGuestIdx(0);
      setErrors({});
    }
  }, [open, existingForm, reservation.id, reservation.num_guests]);

  const availableRegions = REGIONS_BY_COUNTRY[form.country_of_residence] ?? null;

  function set(field: keyof GuestFormEntry, value: string) {
    setForms(prev => {
      const next = [...prev];
      const updated = { ...(next[currentGuestIdx] ?? EMPTY_FORM), [field]: value };
      if (field === "country_of_residence") updated.region = "";
      next[currentGuestIdx] = updated;
      return next;
    });
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof GuestFormEntry, string>> = {};
    if (!form.full_name.trim()) errs.full_name = t("guestForm.required");
    if (!form.date_of_birth)    errs.date_of_birth = t("guestForm.required");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!isLastGuest) {
      // Move to next guest
      setCurrentGuestIdx(i => i + 1);
      setErrors({});
    } else {
      // Final step — save everything
      checkInMutation.mutate({
        forms,
        isEditMode,
        existingFormId: existingForm?.id,
        reservationId: reservation.id,
        reservationTotalPrice: Number(reservation.total_price),
        reservationCheckIn: reservation.check_in_date,
        reservationCheckOut: reservation.check_out_date,
        reservationTouristTax: Number(reservation.tourist_tax_amount ?? 0),
        ttRate: hotelSettings?.tourist_tax_rate ?? 41.5,
      });
    }
  }

  const { checkInMutation } = useGuestFormMutation({
    onSaveSuccess: () => {
      setForms([{ ...EMPTY_FORM }]);
      setCurrentGuestIdx(0);
      setErrors({});
      onSuccess?.();
      onOpenChange(false);
    },
  });

  function handleClose() {
    if (checkInMutation.isPending) return;
    setForms([{ ...EMPTY_FORM }]);
    setCurrentGuestIdx(0);
    setErrors({});
    onOpenChange(false);
  }

  // ── Header labels ─────────────────────────────────────────────────────────

  const dialogTitle = isEditMode
    ? t("guestForm.editTitle")
    : isMultiGuest
      ? t("guestForm.guestOf", { n: String(currentGuestIdx + 1), total: String(totalGuests) })
      : t("guestForm.title");

  const roomPrefix = roomInfo
    ? t("guestForm.roomOf", { n: String(roomInfo.index), total: String(roomInfo.total) })
      + (roomInfo.label ? ` — #${roomInfo.label}` : "")
      + " · "
    : "";

  const dialogSubtitle = isEditMode ? t("guestForm.editSubtitle") : `${roomPrefix}${t("guestForm.subtitle")}`;

  const submitLabel = checkInMutation.isPending
    ? t("guestForm.submitting")
    : isEditMode
      ? t("guestForm.saveEdit")
      : isLastGuest
        ? t("guestForm.submit")
        : t("guestForm.nextGuest");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogSubtitle}</DialogDescription>
        </DialogHeader>

        {/* Progress dots for multi-guest */}
        {!isEditMode && isMultiGuest && (
          <div className="flex gap-1.5 pb-1">
            {Array.from({ length: totalGuests }, (_, i) => (
              <div key={i} className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i < currentGuestIdx  ? "bg-primary" :
                i === currentGuestIdx ? "bg-primary/50" :
                "bg-muted"
              )} />
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Required section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gf-full-name">
                {t("guestForm.fullName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gf-full-name"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder={t("guestForm.fullName")}
              />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gf-dob">
                {t("guestForm.dateOfBirth")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gf-dob"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => set("date_of_birth", e.target.value)}
              />
              {errors.date_of_birth && <p className="text-xs text-destructive">{errors.date_of_birth}</p>}
            </div>
          </div>

          {/* Location section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gf-country">{t("guestForm.country")}</Label>
              <Select value={form.country_of_residence} onValueChange={(v) => set("country_of_residence", v)}>
                <SelectTrigger id="gf-country">
                  <SelectValue placeholder={t("guestForm.selectCountry")} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {language === "uk" ? (COUNTRY_NAMES_UK[c] ?? c) : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gf-region">{t("guestForm.region")}</Label>
              {availableRegions ? (
                <Select value={form.region} onValueChange={(v) => set("region", v)}>
                  <SelectTrigger id="gf-region">
                    <SelectValue placeholder={t("guestForm.selectRegion")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availableRegions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="gf-region"
                  value={form.region}
                  onChange={(e) => set("region", e.target.value)}
                  placeholder={t("guestForm.regionPlaceholder")}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gf-district">{t("guestForm.district")}</Label>
              <Input
                id="gf-district"
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                placeholder={t("guestForm.district")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gf-city">{t("guestForm.villageCity")}</Label>
              <Input
                id="gf-city"
                value={form.village_city}
                onChange={(e) => set("village_city", e.target.value)}
                placeholder={t("guestForm.villageCity")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gf-street">{t("guestForm.streetHouseApt")}</Label>
            <Input
              id="gf-street"
              value={form.street_house_apartment}
              onChange={(e) => set("street_house_apartment", e.target.value)}
              placeholder={t("guestForm.streetHouseApt")}
            />
          </div>

          {/* Document section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gf-passport">{t("guestForm.passportSeries")}</Label>
              <Input
                id="gf-passport"
                value={form.passport_series}
                onChange={(e) => set("passport_series", e.target.value)}
                placeholder={t("guestForm.passportSeries")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gf-issued-by">{t("guestForm.issuedBy")}</Label>
              <Input
                id="gf-issued-by"
                value={form.issued_by}
                onChange={(e) => set("issued_by", e.target.value)}
                placeholder={t("guestForm.issuedBy")}
              />
            </div>
          </div>

          {/* UBD — triggers 20% accommodation discount + tourist tax exemption */}
          <div className="space-y-1.5">
            <Label htmlFor="gf-ubk">{t("guestForm.ubk")}</Label>
            <Input
              id="gf-ubk"
              value={form.ubk}
              onChange={(e) => set("ubk", e.target.value)}
              placeholder={t("guestForm.ubk")}
            />
            <p className="text-xs text-muted-foreground">{t("guestForm.ubkHint")}</p>
            {form.ubk.trim() !== "" && (
              <p className="text-xs font-medium text-green-600">
                {t("guestForm.discountPreview")}:{" "}
                {(reservation.total_price * 0.8).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                {" "}(-20%)
              </p>
            )}
          </div>

          {/* Contact / vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gf-phone">{t("guestForm.phone")}</Label>
              <Input
                id="gf-phone"
                type="tel"
                value={form.phone_number}
                onChange={(e) => set("phone_number", e.target.value)}
                placeholder="+380..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gf-vehicle">{t("guestForm.vehicleNumber")}</Label>
              <Input
                id="gf-vehicle"
                value={form.vehicle_number}
                onChange={(e) => set("vehicle_number", e.target.value)}
                placeholder="AA 1234 BB"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={checkInMutation.isPending}>
              {submitLabel}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={checkInMutation.isPending}>
              {t("guestForm.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
