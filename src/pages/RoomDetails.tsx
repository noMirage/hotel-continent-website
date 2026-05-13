import { useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { uk as ukLocale, enUS } from "date-fns/locale";
import { Users, Maximize, Bed, Check, ArrowLeft } from "lucide-react";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { RoomPhotoCarousel } from "@/components/RoomPhotoCarousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoomType, useRoomTypes } from "@/hooks/useRoomTypes";
import { useLocalizedRoom, useLocalizedRooms } from "@/hooks/useLocalizedRoom";
import { hotelConfig } from "@/config/hotel";
import { useLanguage } from "@/i18n/LanguageContext";
import { FadeIn } from "@/components/ui/FadeIn";
import { BookingFormPanel } from "@/components/rooms/BookingFormPanel";
import { useRoomBookingForm } from "@/hooks/useRoomBookingForm";
import roomDeluxe from "@/assets/room-deluxe.jpg";
import roomExecutive from "@/assets/room-executive.jpg";
import roomPresidential from "@/assets/room-presidential.jpg";
import roomFamily from "@/assets/room-family.jpg";

const roomImages: Record<string, string> = {
  "standard-room": roomDeluxe,
  "deluxe-room": roomDeluxe,
  "executive-suite": roomExecutive,
  "presidential-suite": roomPresidential,
  "family-room": roomFamily,
};

export default function RoomDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [urlParams] = useSearchParams();
  const { t, language } = useLanguage();
  const dateLocale = language === "uk" ? ukLocale : enUS;
  const { data: hotelSettings, checkInTime } = useHotelSettings();
  const { data: rawRoom, isLoading } = useRoomType(slug || "");
  const room = useLocalizedRoom(rawRoom);
  const { data: rawAllRooms } = useRoomTypes();
  const allRooms = useLocalizedRooms(rawAllRooms);
  const similarRooms = allRooms?.filter(r => r.slug !== slug).slice(0, 3) ?? [];
  const form = useRoomBookingForm(room, slug ?? "", urlParams);

  useEffect(() => {
    if (window.location.hash === "#booking") {
      const id = setTimeout(() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" }), 500);
      return () => clearTimeout(id);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-[400px] w-full rounded-lg mb-8" />
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t("roomDetails.roomNotFound")}</h1>
          <Button asChild><Link to="/rooms">{t("roomDetails.viewAllRooms")}</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/rooms"><ArrowLeft className="h-4 w-4" />{t("roomDetails.back")}</Link>
        </Button>
      </div>

      <section className="relative h-[50vh] min-h-[400px]">
        <RoomPhotoCarousel
          roomTypeId={room.id}
          fallbackSrc={roomImages[room.slug] || room.image_url || roomDeluxe}
          alt={room.name}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">{room.name}</h1>
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <span className="flex items-center gap-2"><Users className="h-4 w-4" />{t("featured.upTo")} {room.max_guests} {t("featured.guests")}</span>
                {room.size_sqm && <span className="flex items-center gap-2"><Maximize className="h-4 w-4" />{room.size_sqm} m²</span>}
                {room.bed_type && <span className="flex items-center gap-2"><Bed className="h-4 w-4" />{room.bed_type}</span>}
              </div>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm text-muted-foreground">{t("roomDetails.from")}</p>
              <p className="text-2xl font-bold text-primary">
                {hotelConfig.currencySymbol}{form.minPrice.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">{t("featured.perNight")}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-serif text-2xl font-bold text-foreground mb-4">{t("roomDetails.aboutRoom")}</h2>
                <p className="text-muted-foreground leading-relaxed">{room.description}</p>
              </div>
              {room.amenities && room.amenities.length > 0 && (
                <div>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-4">{t("roomDetails.amenities")}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {room.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" /><span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h2 className="font-serif text-2xl font-bold text-foreground mb-4">{t("roomDetails.policies")}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card><CardContent className="p-4">
                    <p className="font-medium text-foreground">{t("roomDetails.checkIn")}</p>
                    <p className="text-muted-foreground">{t("roomDetails.from")} {checkInTime}</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-4">
                    <p className="font-medium text-foreground">{t("roomDetails.checkOut")}</p>
                    <p className="text-muted-foreground">{hotelConfig.checkOutTime}</p>
                  </CardContent></Card>
                </div>
              </div>
            </div>
            <div id="booking">
              <BookingFormPanel room={room} form={form} hotelSettings={hotelSettings} />
            </div>
          </div>
        </div>
      </section>

      {similarRooms.length > 0 && (
        <section className="py-12 md:py-16 bg-card border-t border-border">
          <div className="container mx-auto px-4">
            <FadeIn>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-8">{t("roomDetails.similarRooms")}</h2>
            </FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarRooms.map((r, i) => (
                <FadeIn key={r.id} delay={i * 100}>
                  <div className="group rounded-xl overflow-hidden border border-border bg-background hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                    <div className="relative h-44 overflow-hidden">
                      <img src={r.image_url || roomImages[r.slug] || roomDeluxe} alt={r.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-medium">
                        {t("featured.from")} {hotelConfig.currencySymbol}{r.base_price}{t("featured.perNight")}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{r.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{r.short_description || r.description}</p>
                      <Button asChild size="sm" className="w-full"><Link to={`/rooms/${r.slug}`}>{t("featured.viewDetails")}</Link></Button>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
