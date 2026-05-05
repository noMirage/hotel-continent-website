-- Add deposit_amount to group_bookings (mirrors the field on reservations)
ALTER TABLE public.group_bookings
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2);
