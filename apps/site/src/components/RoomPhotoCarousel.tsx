"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { StaticImageData } from "next/image";
import { Img } from "@/components/ui/Img";
import { useRoomPhotos } from "@/hooks/useSiteContent";
import { cn } from "@/lib/utils";

interface RoomPhotoCarouselProps {
  roomTypeId: string;
  fallbackSrc: string | StaticImageData;
  alt: string;
  className?: string;
  sizes?: string;
}

export function RoomPhotoCarousel({ roomTypeId, fallbackSrc, alt, className, sizes = "(max-width: 768px) 100vw, 33vw" }: RoomPhotoCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const { data: photos } = useRoomPhotos(roomTypeId);

  const images: { src: string | StaticImageData; alt: string }[] = photos.length > 0
    ? photos.map(p => ({ src: p.url, alt: p.alt_text || alt }))
    : [{ src: fallbackSrc, alt }];

  const total = images.length;
  const prev = () => setCurrent(i => (i - 1 + total) % total);
  const next = () => setCurrent(i => (i + 1) % total);

  const currentImg = images[current];
  // Fall back to local image if the remote URL failed to load
  const effectiveSrc = typeof currentImg.src === "string" && failedUrls.has(currentImg.src) ? fallbackSrc : currentImg.src;

  return (
    <div className={cn("relative overflow-hidden group", className)}>
      {/* Only the current image is in the DOM — no simultaneous remote loads */}
      <Img
        key={current}
        src={effectiveSrc}
        alt={currentImg.alt}
        sizes={sizes}
        onError={() => typeof currentImg.src === "string" && setFailedUrls(prev => new Set([...prev, currentImg.src as string]))}
        className="w-full h-full object-cover transition-all duration-500"
      />

      {total > 1 && (
        <>
          <button
            onClick={e => { e.preventDefault(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-foreground/40 text-primary-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/60"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={e => { e.preventDefault(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-foreground/40 text-primary-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/60"
            aria-label="Next photo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={e => { e.preventDefault(); setCurrent(idx); }}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  idx === current ? "bg-primary-foreground scale-125" : "bg-primary-foreground/50"
                )}
                aria-label={`Photo ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
