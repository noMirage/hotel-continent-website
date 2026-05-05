-- Update hotel_settings with correct contact information
-- Run this in Supabase SQL Editor to fix contact details showing old values

UPDATE public.hotel_settings SET
  hotel_name        = 'Hotel Continent',
  hotel_tagline     = 'Experience Luxury Redefined',
  hotel_description = 'A premier destination for discerning travelers seeking exceptional comfort and world-class service in the heart of the Carpathians.',
  email             = 'continent2005@ukr.net',
  phone             = '+380 (50) 705 5000',
  address           = 'Ukraine, Zakarpattia Oblast, Polyana, 59 Soniachna St.',
  check_in_time     = '14:00',
  check_out_time    = '12:00',
  currency          = 'UAH'
WHERE true;

-- If no row exists yet, insert one
INSERT INTO public.hotel_settings (
  hotel_name, hotel_tagline, hotel_description,
  email, phone, address,
  check_in_time, check_out_time, currency
)
SELECT
  'Hotel Continent',
  'Experience Luxury Redefined',
  'A premier destination for discerning travelers seeking exceptional comfort and world-class service in the heart of the Carpathians.',
  'continent2005@ukr.net',
  '+380 (50) 705 5000',
  'Ukraine, Zakarpattia Oblast, Polyana, 59 Soniachna St.',
  '14:00',
  '12:00',
  'UAH'
WHERE NOT EXISTS (SELECT 1 FROM public.hotel_settings);
