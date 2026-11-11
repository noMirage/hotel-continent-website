import { useMutation, useQueryClient } from "@tanstack/react-query";
import { differenceInDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { DEPOSIT_RATIO } from "@/lib/constants";

export interface GuestFormEntry {
  full_name: string;
  date_of_birth: string;
  country_of_residence: string;
  region: string;
  district: string;
  village_city: string;
  street_house_apartment: string;
  passport_series: string;
  issued_by: string;
  ubk: string;
  phone_number: string;
  vehicle_number: string;
}

export interface CheckInInput {
  forms: GuestFormEntry[];
  isEditMode: boolean;
  existingFormId: string | undefined;
  reservationId: string;
  reservationTotalPrice: number;
  reservationCheckIn: string;
  reservationCheckOut: string;
  reservationTouristTax: number;
  ttRate: number;
}

interface Callbacks {
  onSaveSuccess: () => void;
}

export function useGuestFormMutation({ onSaveSuccess }: Callbacks) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: async (input: CheckInInput): Promise<{ ubdFilled: boolean; isEdit: boolean }> => {
      const {
        forms, isEditMode, existingFormId, reservationId,
        reservationTotalPrice, reservationCheckIn, reservationCheckOut,
        reservationTouristTax, ttRate,
      } = input;

      const { data: { user } } = await supabase.auth.getUser();

      if (isEditMode && existingFormId) {
        const f = forms[0];
        const { error } = await supabase.from("guest_forms").update({
          full_name: f.full_name.trim(),
          date_of_birth: f.date_of_birth,
          country_of_residence: f.country_of_residence || null,
          region: f.region || null,
          district: f.district.trim() || null,
          village_city: f.village_city.trim() || null,
          street_house_apartment: f.street_house_apartment.trim() || null,
          passport_series: f.passport_series.trim() || null,
          issued_by: f.issued_by.trim() || null,
          ubk: f.ubk.trim() || null,
          ubk_discount_applied: f.ubk.trim() !== "",
          phone_number: f.phone_number.trim() || null,
          vehicle_number: f.vehicle_number.trim() || null,
        }).eq("id", existingFormId);
        if (error) throw error;
        return { ubdFilled: false, isEdit: true };
      }

      const ubdCount = forms.filter(f => f.ubk.trim() !== "").length;
      const ubdFilled = ubdCount > 0;

      for (let i = 0; i < forms.length; i++) {
        const f = forms[i];
        const { error } = await supabase.from("guest_forms").insert({
          reservation_id: reservationId,
          created_by_admin_id: user?.id ?? null,
          guest_index: i + 1,
          full_name: f.full_name.trim(),
          date_of_birth: f.date_of_birth,
          country_of_residence: f.country_of_residence || null,
          region: f.region || null,
          district: f.district.trim() || null,
          village_city: f.village_city.trim() || null,
          street_house_apartment: f.street_house_apartment.trim() || null,
          passport_series: f.passport_series.trim() || null,
          issued_by: f.issued_by.trim() || null,
          ubk: f.ubk.trim() || null,
          ubk_discount_applied: f.ubk.trim() !== "",
          phone_number: f.phone_number.trim() || null,
          vehicle_number: f.vehicle_number.trim() || null,
        });
        if (error) throw error;
      }

      const update: Record<string, unknown> = { status: "CHECK_IN" };
      if (ubdFilled) {
        update.total_price = Number((reservationTotalPrice * DEPOSIT_RATIO).toFixed(2));
      }
      if (ubdCount > 0) {
        const nights = differenceInDays(parseISO(reservationCheckOut), parseISO(reservationCheckIn));
        const taxReduction = ttRate * nights * ubdCount;
        update.tourist_tax_amount = Math.max(0, Number((reservationTouristTax - taxReduction).toFixed(2)));
      }
      const { error: resError } = await supabase
        .from("reservations").update(update).eq("id", reservationId);
      if (resError) throw resError;

      return { ubdFilled, isEdit: false };
    },
    onSuccess: ({ ubdFilled, isEdit }) => {
      queryClient.invalidateQueries({ queryKey: QK.adminBookings() });
      queryClient.invalidateQueries({ queryKey: QK.adminCalendarReservations() });
      queryClient.invalidateQueries({ queryKey: QK.dashboard() });
      queryClient.invalidateQueries({ queryKey: QK.guestForm() });

      const description = isEdit
        ? t("guestForm.editedDesc")
        : ubdFilled ? t("guestForm.discountApplied") : t("guestForm.successDesc");
      toast({ title: isEdit ? t("guestForm.edited") : t("guestForm.success"), description });
      onSaveSuccess();
    },
    onError: (e: Error) => {
      if (import.meta.env.DEV) console.error(e);
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" });
    },
  });

  return { checkInMutation };
}
