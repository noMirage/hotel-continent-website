// Static hotel configuration.
// Fallbacks for when the `hotel_settings` row is not available; the admin panel's
// Settings page is the source of truth for contact details.

export const hotelConfig = {
  // Branding
  name: "Hotel Continent",

  // Contact Info
  email: "continent2005@ukr.net",
  phone: "+380 (50) 705 5000",
  address: "Ukraine, Zakarpattia Oblast, Polyana, 59 Soniachna St.",

  // Booking Settings
  checkInTime: "14:00",
  checkOutTime: "12:00",
  currency: "UAH",
  currencySymbol: "₴",

  // Social Media
  social: {
    facebook: "https://www.facebook.com/hotel.continent.ua",
    instagram: "https://www.instagram.com/hotel_continent_ua",
  },
} as const;

export type HotelConfig = typeof hotelConfig;
