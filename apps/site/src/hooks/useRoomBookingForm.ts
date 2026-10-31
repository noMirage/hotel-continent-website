"use client";

import { useState } from "react";
import { useNavigate } from "@/i18n/navigation";
import { format, differenceInDays } from "date-fns";
import { fromLocalDateString } from "@continent/shared/date-utils";
import { createBooking } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAvailability } from "@/hooks/useAvailability";
import { getEffectivePrice, getMinPrice } from "@continent/shared/room-pricing";
import { useGuestPrices } from "@/hooks/useSiteContent";
import { submissionErrorKey } from "@/lib/submission-errors";
import type { RoomType } from "@continent/shared/supabase-types";
import type React from "react";

export type RoomEntry = { id: number; guests: number };

function parseSafeDate(raw: string | null): Date | undefined {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  return fromLocalDateString(raw);
}

function parseSafeAdults(raw: string | null): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 && n <= 99 ? n : 1;
}

export function useRoomBookingForm(
  room: RoomType | null | undefined,
  slug: string,
  urlParams: URLSearchParams,
) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [checkIn, setCheckIn] = useState<Date | undefined>(() => parseSafeDate(urlParams.get("checkIn")));
  const [checkOut, setCheckOut] = useState<Date | undefined>(() => parseSafeDate(urlParams.get("checkOut")));
  const [rooms, setRooms] = useState<RoomEntry[]>([{ id: 1, guests: parseSafeAdults(urlParams.get("adults")) }]);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("+380 ");
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: availableUnits, isLoading: isCheckingAvailability } = useAvailability(room?.id, checkIn, checkOut);

  const { data: guestPrices } = useGuestPrices(room?.id);

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const minPrice = room ? getMinPrice(guestPrices ?? [], room.base_price) : 0;
  const totalPrice = room
    ? rooms.reduce((sum, r) => sum + getEffectivePrice(guestPrices ?? [], r.guests, room.base_price) * nights, 0)
    : 0;
  const enoughAvailable = !!(availableUnits && availableUnits.length >= rooms.length);
  const noRoomsAtAll = !isCheckingAvailability && !!(checkIn && checkOut) && availableUnits?.length === 0;
  const notEnoughRooms = !isCheckingAvailability && !!(checkIn && checkOut) && !!availableUnits?.length && availableUnits.length < rooms.length;
  const nextRoomId = rooms.length ? Math.max(...rooms.map(r => r.id)) + 1 : 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!room || !checkIn || !checkOut || !availableUnits?.length) {
      toast({ title: t("common.error"), description: t("roomDetails.errorDates"), variant: "destructive" });
      return;
    }
    if (!enoughAvailable) {
      toast({ title: t("common.error"), description: t("roomDetails.notEnoughRooms"), variant: "destructive" });
      return;
    }
    if (!guestName || !guestPhone) {
      toast({ title: t("common.error"), description: t("roomDetails.errorFields"), variant: "destructive" });
      return;
    }
    const digitsAfterCode = guestPhone.replace(/^\+380\s*/, "").replace(/\D/g, "");
    if (digitsAfterCode.length !== 9) {
      toast({ title: t("common.error"), description: t("roomDetails.errorPhone"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const ciStr = format(checkIn, "yyyy-MM-dd");
      const coStr = format(checkOut, "yyyy-MM-dd");
      // Units and prices are assigned server-side; the client only sends what the guest chose.
      const result = await createBooking({
        checkIn: ciStr,
        checkOut: coStr,
        rooms: rooms.map(r => ({ roomTypeId: room.id, guests: r.guests })),
        guestName,
        guestPhone,
        guestEmail: guestEmail.trim() || null,
        specialRequests: specialRequests || null,
      });
      if (!result.ok) {
        toast({ title: t("roomDetails.bookingFailed"), description: t(submissionErrorKey(result.error)), variant: "destructive" });
        return;
      }
      toast({ title: t("booking.submitted"), description: t("booking.received") });
      navigate(`/booking-confirmation?room=${encodeURIComponent(room.name)}&checkIn=${ciStr}&checkOut=${coStr}&total=${result.data.total}`);
    } catch (err: any) {
      if (process.env.NODE_ENV !== "production") console.error("Booking error:", err);
      toast({ title: t("roomDetails.bookingFailed"), description: t("roomDetails.tryAgain"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    checkIn, setCheckIn,
    checkOut, setCheckOut,
    rooms, setRooms,
    guestName, setGuestName,
    guestEmail, setGuestEmail,
    guestPhone, setGuestPhone,
    specialRequests, setSpecialRequests,
    isSubmitting,
    nights, minPrice, totalPrice,
    enoughAvailable, noRoomsAtAll, notEnoughRooms, nextRoomId,
    availableUnits, isCheckingAvailability,
    guestPrices,
    handleSubmit,
  };
}

export type RoomBookingForm = ReturnType<typeof useRoomBookingForm>;
