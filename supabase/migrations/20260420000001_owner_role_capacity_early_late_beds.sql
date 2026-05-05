-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add 'owner' to the app_role enum
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Extend bed_config check constraint with new bed types
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.room_units
  DROP CONSTRAINT IF EXISTS room_units_bed_config_check;

ALTER TABLE public.room_units
  ADD CONSTRAINT room_units_bed_config_check
  CHECK (bed_config IN (
    'double_bed',
    'twin_beds',
    'double_bed_sofa',
    'triple_single',
    'quad_single'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add total_capacity to hotel_settings
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.hotel_settings
  ADD COLUMN IF NOT EXISTS total_capacity INTEGER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Add early check-in / late check-out fees to reservations
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS early_checkin_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_checkout_fee  NUMERIC NOT NULL DEFAULT 0;
