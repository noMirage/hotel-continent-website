-- Add CHECK_IN status to booking_status enum
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'CHECK_IN';

-- Create guest_forms table to store check-in guest data
CREATE TABLE IF NOT EXISTS public.guest_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  country_of_residence TEXT,
  region TEXT,
  district TEXT,
  village_city TEXT,
  street_house_apartment TEXT,
  passport_series TEXT,
  issued_by TEXT,
  ubk TEXT,
  ubk_discount_applied BOOLEAN DEFAULT FALSE,
  phone_number TEXT,
  vehicle_number TEXT,
  created_by_admin_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_guest_forms_updated_at
  BEFORE UPDATE ON public.guest_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on guest_forms
ALTER TABLE public.guest_forms ENABLE ROW LEVEL SECURITY;

-- Admins can fully manage guest forms
CREATE POLICY "Admins can manage guest forms"
  ON public.guest_forms
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update reservation delete policy:
-- Regular admin can delete only non-CHECK_IN reservations.
-- Super admin can delete any reservation (including CHECK_IN).
DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservations;

CREATE POLICY "Admins can delete reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (
      public.has_role(auth.uid(), 'admin')
      AND status::text != 'CHECK_IN'
    )
  );
