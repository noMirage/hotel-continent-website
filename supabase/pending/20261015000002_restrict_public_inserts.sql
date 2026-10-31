-- ⚠️ NOT a regular migration yet — lives in supabase/pending/ on purpose.
--
-- Drops the policies that let anonymous visitors INSERT directly into tables. After the
-- public site runs on Next.js, every public form goes through the SECURITY DEFINER RPCs
-- from 20261015000001_public_submission_rpcs.sql, so these policies are only an attack
-- surface (spam, client-chosen prices).
--
-- Apply ONLY after hotel-continent.com is served by apps/site: the old SPA's public pages
-- still insert directly and would break. To apply: move this file to supabase/migrations/
-- and run `npx supabase db push` (prod), then the same with --db-url for the demo DB.
--
-- Staff inserts are unaffected: "Admins can create reservations" stays in place, and the
-- admin panel never inserts into promo_applications / group_booking_requests.

DROP POLICY IF EXISTS "Public can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.promo_applications;
DROP POLICY IF EXISTS "anon_insert_group_booking_requests" ON public.group_booking_requests;
