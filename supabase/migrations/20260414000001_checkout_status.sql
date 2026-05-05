-- Add CHECK_OUT status to booking_status enum
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'CHECK_OUT';

-- Update reservation delete policy:
-- Regular admin can delete only PENDING / CONFIRMED / DECLINED / CANCELLED.
-- Super admin can delete any reservation, including CHECK_IN and CHECK_OUT.
DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservations;

CREATE POLICY "Admins can delete reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (
      public.has_role(auth.uid(), 'admin')
      AND status::text NOT IN ('CHECK_IN', 'CHECK_OUT')
    )
  );
