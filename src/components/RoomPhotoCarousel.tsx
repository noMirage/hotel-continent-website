import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { QK } from "@/lib/queryKeys";

interface RoomPhotoCarouselProps {
  roomTypeId: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
}

export function RoomPhotoCarousel({ roomTypeId, fallbackSrc, alt, className }: RoomPhotoCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const { data: photos } = useQuery({
    queryKey: QK.roomPhotosPublic(roomTypeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_media")
        .select("url, alt_text, is_primary")
        .eq("room_type_id", roomTypeId)
        .order("sort_order");
      if (error) throw error;
      return data as Array<{ url: string; alt_text: string | null; is_primary: boolean | null }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const images = photos && photos.length > 0
    ? photos.map(p => ({ src: p.url, alt: p.alt_text || alt }))
    : [{ src: fallbackSrc, alt }];

  const total = images.length;
  const prev = () => setCurrent(i => (i - 1 + total) % total);
  const next = () => setCurrent(i => (i + 1) % total);

  const currentImg = images[current];
  // Fall back to local image if the remote URL failed to load
  const effectiveSrc = failedUrls.has(currentImg.src) ? fallbackSrc : currentImg.src;

  return (
    <div className={cn("relative overflow-hidden group", className)}>
      {/* Only the current image is in the DOM — no simultaneous remote loads */}
      <img
        key={current}
        src={effectiveSrc}
        alt={currentImg.alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrls(prev => new Set([...prev, currentImg.src]))}
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
