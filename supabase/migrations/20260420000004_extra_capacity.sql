-- Add extra_capacity to hotel_settings to store additional bed capacity
-- (extra beds, sofa beds, etc.) separate from the auto-calculated room capacity
ALTER TABLE public.hotel_settings
  ADD COLUMN IF NOT EXISTS extra_capacity integer DEFAULT 0;
