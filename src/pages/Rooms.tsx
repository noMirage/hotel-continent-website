import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Maximize, Bed, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useLocalizedRooms } from "@/hooks/useLocalizedRoom";
import { hotelConfig } from "@/config/hotel";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { supabase } from "@/integrations/supabase/client";
import { getMinPrice } from "@/lib/room-pricing";
import { QK } from "@/lib/queryKeys";
import type { RoomTypeGuestPrice } from "@/lib/supabase-types";
import { useLanguage } from "@/i18n/LanguageContext";
import { RoomPhotoCarousel } from "@/components/RoomPhotoCarousel";
import { FadeIn } from "@/components/ui/FadeIn";
import { cn } from "@/lib/utils";
import roomHero from "@/assets/hotel-hall.webp";

// Room images mapping (fallback when no photos uploaded)
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

export default function RoomsPage() {
  const { data: rawRooms, isLoading, error } = useRoomTypes();
  const rooms = useLocalizedRooms(rawRooms);
  const { t } = useLanguage();
  const { hotelName } = useHotelSettings();
  const [guestFilter, setGuestFilter] = useState<number | null>(null);
  const [sort, setSort] = useState<"default" | "asc" | "desc">("default");

  const { data: allGuestPrices } = useQuery({
    queryKey: QK.allRoomTypeGuestPrices(),
    queryFn: async () => {
      const { data, error } = await supabase.from("room_type_guest_prices").select("*");
      if (error) throw error;
      return data as RoomTypeGuestPrice[];
    },
    staleTime: 10 * 60 * 1000,
  });
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <section className="relative h-[45vh] min-h-[320px] flex items-end overflow-hidden">
        <img src={roomHero} alt="Hotel Continent" fetchPriority="high" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="relative container mx-auto px-4 pb-10">
          <FadeIn direction="up">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-3">
              {t("rooms.title")}
            </h1>
            <p className="text-lg text-white/80 max-w-2xl">
              {t("rooms.subtitle")} {hotelName}
            </p>
          </FadeIn>
        </div>
      </section>
      
      {/* Room Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">

          {/* Filter / Sort bar */}
          {!isLoading && rooms && rooms.length > 0 && (
            <FadeIn className="flex flex-wrap items-center gap-3 mb-10">
              {/* Guest filter chips */}
              <span className="text-sm font-medium text-muted-foreground mr-1">{t("rooms.filterGuests")}:</span>
              {[null, 1, 2, 3, 4].map((g) => (
                <button
                  key={g ?? "all"}
                  onClick={() => setGuestFilter(g)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                    guestFilter === g
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {g === null ? t("rooms.filterAll") : g === 4 ? "4+" : g}
                </button>
              ))}

              {/* Sort */}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">{t("rooms.sort")}:</span>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as any)}
                  className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="default">{t("rooms.sortDefault")}</option>
                  <option value="asc">{t("rooms.sortPriceLow")}</option>
                  <option value="desc">{t("rooms.sortPriceHigh")}</option>
                </select>
              </div>
            </FadeIn>
          )}

          {isLoading ? (
            <div className="space-y-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <Skeleton className="h-64 lg:h-80" />
                    <div className="p-6 lg:p-8 space-y-4">
                      <Skeleton className="h-8 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-2">{t("rooms.errorLoading")}</p>
              <p className="text-xs text-muted-foreground/60">{t("rooms.checkConnection")}</p>
            </div>
          ) : !rooms || rooms.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">{t("rooms.noRooms")}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {(rooms ?? [])
                .filter(r => guestFilter === null || r.max_guests >= guestFilter)
                .sort((a, b) => sort === "asc" ? a.base_price - b.base_price : sort === "desc" ? b.base_price - a.base_price : 0)
                .map((room, index) => (
                <FadeIn key={room.id} delay={index * 80}>
                <Card
                  className="overflow-hidden border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                >
                  <div className={`grid grid-cols-1 lg:grid-cols-2`}>
                    <div className={`relative h-64 lg:h-80 overflow-hidden ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                      <RoomPhotoCarousel
                        roomTypeId={room.id}
                        fallbackSrc={roomImages[room.slug] || room.image_url || roomDeluxe}
                        alt={room.name}
                        className="h-full w-full"
                      />
                      <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium z-10">
                        {t("featured.from")} {hotelConfig.currencySymbol}{getMinPrice((allGuestPrices ?? []).filter(p => p.room_type_id === room.id), room.base_price).toLocaleString()}{t("featured.perNight")}
                      </div>
                    </div>
                    <CardContent className={`p-6 lg:p-8 flex flex-col justify-center ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                      <h2 className="font-serif text-2xl lg:text-3xl font-bold text-foreground mb-3">
                        {room.name}
                      </h2>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {room.short_description || room.description}
                      </p>
                      
                      {/* Room Info */}
                      <div className="flex flex-wrap gap-4 mb-6">
                        <span className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                          <Users className="h-4 w-4" />
                          {t("featured.upTo")} {room.max_guests} {t("featured.guests")}
                        </span>
                        {room.size_sqm && (
                          <span className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                            <Maximize className="h-4 w-4" />
                            {room.size_sqm} m²
                          </span>
                        )}
                        {room.bed_type && (
                          <span className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                            <Bed className="h-4 w-4" />
                            {room.bed_type}
                          </span>
                        )}
                      </div>
                      
                      {/* Amenities Preview */}
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {room.amenities.slice(0, 5).map((amenity) => (
                            <span key={amenity} className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Check className="h-3 w-3 text-primary" />
                              {amenity}
                            </span>
                          ))}
                          {room.amenities.length > 5 && (
                            <span className="text-xs text-muted-foreground">
                              +{room.amenities.length - 5} {t("rooms.more")}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-4">
                        <Button asChild>
                          <Link to={`/rooms/${room.slug}`}>{t("featured.viewDetails")}</Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link to={`/rooms/${room.slug}#booking`}>{t("nav.bookNow")}</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
