import { Link } from "react-router-dom";
import { ArrowRight, Users, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useLocalizedRooms } from "@/hooks/useLocalizedRoom";
import { hotelConfig } from "@/config/hotel";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { RoomPhotoCarousel } from "@/components/RoomPhotoCarousel";

// Room images mapping
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

export function FeaturedRoomsSection() {
  const { data: rawRooms, isLoading, error } = useRoomTypes();
  const rooms = useLocalizedRooms(rawRooms);
  const { t } = useLanguage();
  
  const featuredRooms = rooms?.slice(0, 3) || [];
  
  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12 md:mb-16">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("featured.title")}
            </h2>
            <p className="text-muted-foreground max-w-xl">
              {t("featured.subtitle")}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/rooms" className="gap-2">
              {t("featured.viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-56 w-full" />
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error || !rooms || rooms.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {error ? t("rooms.errorLoading") : t("rooms.noRooms")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {featuredRooms.map((room) => (
              <Card
                key={room.id}
                className="group overflow-hidden border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="relative h-56 overflow-hidden">
                  <RoomPhotoCarousel
                    roomTypeId={room.id}
                    fallbackSrc={roomImages[room.slug] || room.image_url || roomDeluxe}
                    alt={room.name}
                    className="h-full w-full"
                  />
                  <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium z-10">
                    {t("featured.from")} {hotelConfig.currencySymbol}{room.base_price}{t("featured.perNight")}
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="font-serif text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {room.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {room.short_description || room.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {t("featured.upTo")} {room.max_guests} {t("featured.guests")}
                    </span>
                    {room.size_sqm && (
                      <span className="flex items-center gap-1">
                        <Maximize className="h-4 w-4" />
                        {room.size_sqm} m²
                      </span>
                    )}
                  </div>
                  <Button asChild className="w-full">
                    <Link to={`/rooms/${room.slug}`}>{t("featured.viewDetails")}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
