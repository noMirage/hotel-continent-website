import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { RoomType } from "@/lib/supabase-types";

function localizeRoom(room: RoomType, language: string): RoomType {
  if (language !== "uk") return room;
  return {
    ...room,
    name: room.name_uk || room.name,
    description: room.description_uk || room.description,
    short_description: room.short_description_uk || room.short_description,
    amenities: (room.amenities_uk && room.amenities_uk.length > 0)
      ? room.amenities_uk
      : room.amenities,
  };
}

/**
 * Returns a localized version of a RoomType based on current language.
 * Falls back to English if Ukrainian translation is missing.
 * Accepts null/undefined safely — always called unconditionally (React rules).
 */
export function useLocalizedRoom(room: RoomType | null | undefined): RoomType | null | undefined {
  const { language } = useLanguage();
  return useMemo(() => {
    if (!room) return room;
    return localizeRoom(room, language);
  }, [room, language]);
}

/**
 * Localizes an array of rooms. Returns undefined if input is undefined.
 */
export function useLocalizedRooms(rooms: RoomType[] | undefined): RoomType[] | undefined {
  const { language } = useLanguage();
  return useMemo(() => {
    if (!rooms) return rooms;
    if (language !== "uk") return rooms;
    return rooms.map(room => localizeRoom(room, language));
  }, [rooms, language]);
}
