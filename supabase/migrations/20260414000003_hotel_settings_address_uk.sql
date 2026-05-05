-- Add Ukrainian address field to hotel_settings
-- Allows the footer to display the address in Ukrainian when UI language is set to Ukrainian
ALTER TABLE public.hotel_settings
  ADD COLUMN IF NOT EXISTS address_uk TEXT;
