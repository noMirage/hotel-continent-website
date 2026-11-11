-- Applied after the public site moved to apps/site (2026-11-12).
--
-- Drops the policies that let anonymous visitors INSERT directly into tables. After the
-- public site runs on Next.js, every public form goes through the SECURITY DEFINER RPCs
-- from 20261015000001_public_submission_rpcs.sql, so these policies are only an attack
-- surface (spam, client-chosen prices).
--
-- Staff inserts are unaffected: "Admins can create reservations" stays in place, and the
-- admin panel never inserts into promo_applications / group_booking_requests.

DROP POLICY IF EXISTS "Public can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.promo_applications;
DROP POLICY IF EXISTS "anon_insert_group_booking_requests" ON public.group_booking_requests;
