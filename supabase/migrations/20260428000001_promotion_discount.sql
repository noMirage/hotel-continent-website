-- Add discount percentage to promotional offers
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Track which promotion was applied when a reservation was created
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
