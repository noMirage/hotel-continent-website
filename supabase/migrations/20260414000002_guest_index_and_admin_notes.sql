-- Add guest_index to guest_forms to support multi-guest check-in
-- (each row represents one guest; guest_index=1 is the first/primary guest)
ALTER TABLE public.guest_forms
  ADD COLUMN IF NOT EXISTS guest_index INTEGER NOT NULL DEFAULT 1;

-- Ensure admin_notes column exists on reservations
-- (safety net in case the initial migration was not fully applied on the remote DB)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
