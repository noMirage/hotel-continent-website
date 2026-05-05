// Hotel Configuration
// This file contains all configurable settings for the hotel template
// Change these values to customize the hotel branding and settings

export const hotelConfig = {
  // Branding
  name: "Hotel Continent",
  tagline: "Experience Luxury Redefined",
  description: "A premier destination for discerning travelers seeking exceptional comfort and world-class service.",
  
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
  
  // Features/Amenities for homepage
  amenities: [
    { name: "Spa & Wellness", icon: "Sparkles", description: "Rejuvenate with our world-class spa treatments" },
    { name: "Fine Dining", icon: "UtensilsCrossed", description: "Savor exquisite cuisine from renowned chefs" },
    { name: "Fitness Center", icon: "Dumbbell", description: "State-of-the-art equipment available 24/7" },
    { name: "Pool & Lounge", icon: "Waves", description: "Relax by our stunning infinity pool" },
    { name: "Concierge", icon: "Bell", description: "Personalized service for all your needs" },
    { name: "Free WiFi", icon: "Wifi", description: "High-speed internet throughout the property" },
  ],
} as const;

export type HotelConfig = typeof hotelConfig;
