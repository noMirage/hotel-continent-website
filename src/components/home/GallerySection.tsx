import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

// Import hotel photos
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

const galleryItems = [
  { src: hotelHall,        alt: "gallery.hall",        category: "hotel" },
  { src: hotelRoom,        alt: "gallery.deluxe",      category: "rooms" },
  { src: hotelRestaurant,  alt: "gallery.restaurant",  category: "hotel" },
  { src: hotelSauna,       alt: "gallery.sauna",       category: "hotel" },
  { src: hotelPool,        alt: "gallery.pool",        category: "hotel" },
  { src: hotelRestaurant1, alt: "gallery.restaurant2", category: "hotel" },
  { src: hotelFootball,    alt: "gallery.football",    category: "hotel" },
  { src: hotelRestaurant2, alt: "gallery.restaurant3", category: "hotel" },
  { src: hotelDecoration,  alt: "gallery.decoration",  category: "hotel" },
  { src: hotelDecoration1, alt: "gallery.decoration2", category: "hotel" },
];

// Grid layout: vary sizes for visual interest
const gridClasses = [
  "col-span-2 row-span-2", // large
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2", // tall
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
];

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

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 text-primary-foreground/80 hover:text-primary-foreground transition-colors p-2 rounded-full hover:bg-primary-foreground/10"
        onClick={onClose}
        aria-label={t("gallery.close")}
      >
        <X className="h-7 w-7" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-sm text-primary-foreground/60 font-medium">
        {t("gallery.photo")} {index + 1} {t("gallery.of")} {images.length}
      </div>

      {/* Prev */}
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-foreground/80 hover:text-primary-foreground transition-colors p-3 rounded-full hover:bg-primary-foreground/10"
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        aria-label={t("gallery.prev")}
      >
        <ChevronLeft className="h-8 w-8" />
      </button>

      {/* Image */}
      <div className="max-w-5xl max-h-[85vh] px-20" onClick={(e) => e.stopPropagation()}>
        <img
          key={index}
          src={images[index].src}
          alt={images[index].alt}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          style={{ animation: "fadeIn 0.2s ease-out" }}
        />
      </div>

      {/* Next */}
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-foreground/80 hover:text-primary-foreground transition-colors p-3 rounded-full hover:bg-primary-foreground/10"
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        aria-label={t("gallery.next")}
      >
        <ChevronRight className="h-8 w-8" />
      </button>

      {/* Thumbnail strip */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); /* handled by parent */ }}
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
    </div>
  );
}

export function GallerySection() {
  const { t } = useLanguage();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevImage = useCallback(() =>
    setLightboxIndex(i => i !== null ? (i - 1 + galleryItems.length) % galleryItems.length : null), []);
  const nextImage = useCallback(() =>
    setLightboxIndex(i => i !== null ? (i + 1) % galleryItems.length : null), []);

  // Show first 6 in grid, rest accessible via lightbox
  const visibleItems = galleryItems.slice(0, 6);

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">
            {t("gallery.eyebrow")}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("gallery.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("gallery.subtitle")}
          </p>
        </div>

        {/* Mosaic Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 grid-rows-3 gap-3 h-[500px] md:h-[600px]">
          {visibleItems.map((item, index) => (
            <div
              key={index}
              className={cn(
                "relative overflow-hidden rounded-xl cursor-pointer group",
                gridClasses[index]
              )}
              onClick={() => openLightbox(index)}
            >
              <img
                src={item.src}
                alt={item.alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-all duration-300 flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
              </div>
              {/* Last visible tile: show "view all" overlay */}
              {index === 5 && galleryItems.length > 6 && (
                <div className="absolute inset-0 bg-foreground/60 flex flex-col items-center justify-center text-primary-foreground">
                  <span className="font-serif text-3xl font-bold">+{galleryItems.length - 5}</span>
                  <span className="text-sm mt-1 opacity-80">{t("gallery.viewAll")}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={galleryItems}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </section>
  );
}
