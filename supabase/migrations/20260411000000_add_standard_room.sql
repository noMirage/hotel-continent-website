-- Add Standard Room type (skip if already exists)
INSERT INTO public.room_types (
  name, slug, description, short_description,
  base_price, max_guests, size_sqm, bed_type,
  amenities, is_active, sort_order
)
SELECT
  'Standard Room',
  'standard-room',
  'A comfortable and well-appointed standard room offering everything you need for a pleasant stay. Featuring a cosy double bed, a private bathroom with shower, a work desk, and a flat-screen TV. Ideal for solo travellers or couples visiting the Carpathian region.',
  'Cosy and well-equipped room perfect for short stays or weekend getaways in the Carpathians.',
  1800.00, 2, 22, 'Double Bed',
  ARRAY['Free WiFi','Flat-Screen TV','Private Bathroom','Work Desk','Air Conditioning','Mini-Fridge','Safe','Hairdryer','Daily Housekeeping'],
  true, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.room_types WHERE slug = 'standard-room'
);

-- Add room units with numbers that don't conflict
INSERT INTO public.room_units (room_type_id, room_number, floor, is_active)
SELECT rt.id, unit.room_number, unit.floor, true
FROM public.room_types rt
CROSS JOIN (VALUES
  ('S01', 1), ('S02', 1), ('S03', 1), ('S04', 1),
  ('S05', 2), ('S06', 2), ('S07', 2), ('S08', 2)
) AS unit(room_number, floor)
WHERE rt.slug = 'standard-room'
  AND NOT EXISTS (
    SELECT 1 FROM public.room_units WHERE room_number = unit.room_number
  );