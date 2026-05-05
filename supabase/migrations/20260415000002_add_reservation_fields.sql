-- Add assigned admin, deposit amount, and payment method to reservations
-- assigned_admin_id: the admin who first processed the UNPROCESSED request (only super_admin can change it)
-- deposit_amount: actual deposit collected when status moves PENDING → CONFIRMED
-- payment_method: how the guest paid ('cash', 'card')

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deposit_amount     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_method     TEXT;
