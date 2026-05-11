import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

import hotelRoom         from "@/assets/hotel-room.webp";
import hotelHall         from "@/assets/hotel-hall.webp";
import hotelRestaurant   from "@/assets/hotel-restaurant.webp";
import hotelSauna        from "@/assets/hotel-sauna.webp";
import hotelPool         from "@/assets/hotel-pool.webp";
import hotelRestaurant1  from "@/assets/hotel-restaurant-1.webp";
import hotelFootball     from "@/assets/hotel-football.webp";
import hotelRestaurant2  from "@/assets/hotel-restaurant-2.webp";
import hotelDecoration   from "@/assets/hotel-decoration.webp";
import hotelDecoration1  from "@/assets/hotel-decoration-1.webp";
import hotelConference1  from "@/assets/hotel-conference-1.jpg";
import hotelConference2  from "@/assets/hotel-conference-2.jpg";
import hotelConference3  from "@/assets/hotel-conference-3.jpg";

type Category = "restaurant" | "conference" | "leisure" | "rooms" | "hotel";
type FilterKey = "all" | Category;

const galleryItems: { src: string; alt: string; category: Category }[] = [
  { src: hotelHall,        alt: "Hotel Hall",      category: "hotel" },
  { src: hotelRoom,        alt: "Deluxe Room",     category: "rooms" },
  { src: hotelRestaurant,  alt: "Restaurant",      category: "restaurant" },
  { src: hotelSauna,       alt: "Sauna",           category: "leisure" },
  { src: hotelPool,        alt: "Pool",            category: "leisure" },
  { src: hotelRestaurant1, alt: "Restaurant",      category: "restaurant" },
  { src: hotelFootball,    alt: "Football",        category: "leisure" },
  { src: hotelRestaurant2, alt: "Restaurant",      category: "restaurant" },
  { src: hotelDecoration,  alt: "Hotel",           category: "hotel" },
  { src: hotelDecoration1, alt: "Hotel",           category: "hotel" },
  { src: hotelConference1, alt: "Conference Room", category: "conference" },
  { src: hotelConference2, alt: "Conference Room", category: "conference" },
  { src: hotelConference3, alt: "Conference Room", category: "conference" },
];

const FILTERS: { key: FilterKey; labelKey: string }[] = [
  { key: "all",        labelKey: "gallery.filterAll" },
  { key: "restaurant", labelKey: "gallery.filterRestaurant" },
  { key: "conference", labelKey: "gallery.filterConference" },
  { key: "leisure",    labelKey: "gallery.filterLeisure" },
  { key: "rooms",      labelKey: "gallery.filterRooms" },
  { key: "hotel",      labelKey: "gallery.filterHotel" },
];

const CATEGORY_LABEL: Record<Category, string> = {
  restaurant: "gallery.filterRestaurant",
  conference: "gallery.filterConference",
  leisure:    "gallery.filterLeisure",
  rooms:      "gallery.filterRooms",
  hotel:      "gallery.filterHotel",
};

interface LightboxProps {
  images: typeof galleryItems;
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function Lightbox({ images, index, onClose, onPrev, onNext }: LightboxProps) {
  const { t } = useLanguage();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-primary-foreground/80 hover:text-primary-foreground transition-colors p-2 rounded-full hover:bg-primary-foreground/10"
        onClick={onClose}
        aria-label={t("gallery.close")}
      >
        <X className="h-7 w-7" />
      </button>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-sm text-primary-foreground/60 font-medium">
        {t("gallery.photo")} {index + 1} {t("gallery.of")} {images.length}
      </div>

      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-foreground/80 hover:text-primary-foreground transition-colors p-3 rounded-full hover:bg-primary-foreground/10"
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        aria-label={t("gallery.prev")}
      >
        <ChevronLeft className="h-8 w-8" />
      </button>

      <div className="max-w-5xl max-h-[85vh] px-20" onClick={(e) => e.stopPropagation()}>
        <img
          key={index}
          src={images[index].src}
          alt={images[index].alt}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          style={{ animation: "fadeIn 0.2s ease-out" }}
        />
      </div>

      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-foreground/80 hover:text-primary-foreground transition-colors p-3 rounded-full hover:bg-primary-foreground/10"
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        aria-label={t("gallery.next")}
      >
        <ChevronRight className="h-8 w-8" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4 overflow-x-auto max-w-full">
        {images.map((img, i) => (
          <button
            key={i}
            className={cn(
              "w-12 h-8 rounded overflow-hidden border-2 transition-all flex-shrink-0",
              i === index ? "border-primary opacity-100" : "border-transparent opacity-40 hover:opacity-70"
            )}
          >
            <img src={img.src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>,
    document.body
  );
}

export function GallerySection() {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const filteredItems = activeFilter === "all"
    ? galleryItems
    : galleryItems.filter(item => item.category === activeFilter);

  const handleFilterChange = (filter: FilterKey) => {
    setActiveFilter(filter);
    setLightboxIndex(null);
    carouselRef.current?.scrollTo({ left: 0, behavior: "instant" });
  };

  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex(i => i !== null ? (i - 1 + filteredItems.length) % filteredItems.length : null);
  const nextImage = () => setLightboxIndex(i => i !== null ? (i + 1) % filteredItems.length : null);

  const galleryCard = (item: typeof galleryItems[number], index: number, wrapperClass = "", imgClass = "h-auto") => (
    <div
      key={item.src + index}
      className={cn("relative overflow-hidden rounded-xl cursor-pointer group", wrapperClass)}
      onClick={() => setLightboxIndex(index)}
    >
      <img
        src={item.src}
        alt={item.alt}
        loading="lazy"
        decoding="async"
        className={cn("w-full block transition-transform duration-500 group-hover:scale-105", imgClass)}
      />
      <div className="absolute bottom-3 left-3">
        <span className="px-3 py-1 bg-foreground/60 backdrop-blur-sm text-primary-foreground text-xs font-semibold uppercase tracking-widest rounded-full">
          {t(CATEGORY_LABEL[item.category])}
        </span>
      </div>
      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/25 transition-all duration-300 flex items-center justify-center">
        <ZoomIn className="h-8 w-8 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
      </div>
    </div>
  );

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-10">
          <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">
            {t("gallery.eyebrow")}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t("gallery.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mb-8">
            {t("gallery.subtitle")}
          </p>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(filter => (
              <button
                key={filter.key}
                onClick={() => handleFilterChange(filter.key)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                  activeFilter === filter.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-foreground border-border hover:border-primary hover:text-primary"
                )}
              >
                {t(filter.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile: horizontal snap carousel */}
        <div
          ref={carouselRef}
          className="sm:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          {filteredItems.map((item, index) =>
            galleryCard(item, index, "snap-start shrink-0 w-[78vw] h-52", "h-full object-cover")
          )}
        </div>

        {/* Desktop: masonry grid */}
        <div className="hidden sm:block columns-2 lg:columns-3 xl:columns-4 gap-3">
          {filteredItems.map((item, index) =>
            galleryCard(item, index, "break-inside-avoid mb-3 block")
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={filteredItems}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </section>
  );
}
