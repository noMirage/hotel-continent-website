-- Add early check-in and late check-out fee columns per room assignment
ALTER TABLE public.group_booking_room_assignments
  ADD COLUMN IF NOT EXISTS early_checkin_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_checkout_fee numeric NOT NULL DEFAULT 0;
