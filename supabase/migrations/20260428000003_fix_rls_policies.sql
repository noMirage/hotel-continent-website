-- Corrective RLS migration: replace USING(true) blanket policies with role-checked ones.
-- Findings: #1 promotions, #2 promo_applications, #3 group_booking_requests.
-- has_role(uid, 'admin') already catches 'super_admin' via fix_has_role_super_admin.sql,
-- but we include super_admin explicitly to match the pattern in group_bookings_and_calculations.sql.

-- ────────────────────────────────────────────────────────────
-- Fix #1 — promotions
-- Drop: "Authenticated manage promotions" (FOR ALL TO authenticated USING (true))
-- Keep: "Anyone can read promotions" (public SELECT)
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated manage promotions" ON public.promotions;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'admin_manage_promotions' AND tablename = 'promotions'
  ) THEN
    CREATE POLICY "admin_manage_promotions" ON public.promotions
      FOR ALL
      USING (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'owner')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'owner')
      );
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- Fix #2 — promo_applications
-- Drop: "Authenticated read applications"  (FOR SELECT TO authenticated USING (true))
--       "Authenticated update applications" (FOR UPDATE TO authenticated USING (true))
-- Keep: "Anyone can submit applications"   (public INSERT — website form)
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated read applications"   ON public.promo_applications;
DROP POLICY IF EXISTS "Authenticated update applications" ON public.promo_applications;

DO $$ BEGIN
  -- admin, viewer, and owner can read applications in the admin panel
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'admin_read_promo_applications' AND tablename = 'promo_applications'
  ) THEN
    CREATE POLICY "admin_read_promo_applications" ON public.promo_applications
      FOR SELECT
      USING (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'viewer') OR
        public.has_role(auth.uid(), 'owner')
      );
  END IF;

  -- only admin and owner can update application status / admin_feedback (viewer is read-only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'admin_update_promo_applications' AND tablename = 'promo_applications'
  ) THEN
    CREATE POLICY "admin_update_promo_applications" ON public.promo_applications
      FOR UPDATE
      USING (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'owner')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'owner')
      );
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- Fix #3 — group_booking_requests
-- Drop: "authenticated_all_group_booking_requests" (FOR ALL TO authenticated USING (true))
-- Keep: "anon_insert_group_booking_requests" (INSERT TO anon, authenticated — public form)
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "authenticated_all_group_booking_requests" ON public.group_booking_requests;

DO $$ BEGIN
  -- admin, viewer, and owner can SELECT requests in the admin panel
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'admin_read_group_booking_requests' AND tablename = 'group_booking_requests'
  ) THEN
    CREATE POLICY "admin_read_group_booking_requests" ON public.group_booking_requests
      FOR SELECT
      USING (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'viewer') OR
        public.has_role(auth.uid(), 'owner')
      );
  END IF;

  -- only admin and owner can UPDATE (status, admin_notes) or DELETE requests (viewer is read-only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'admin_write_group_booking_requests' AND tablename = 'group_booking_requests'
  ) THEN
    CREATE POLICY "admin_write_group_booking_requests" ON public.group_booking_requests
      FOR ALL
      USING (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'owner')
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'owner')
      );
  END IF;
END $$;
