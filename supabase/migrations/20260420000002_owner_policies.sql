-- ─────────────────────────────────────────────────────────────────────────────
-- Owner RLS policies
-- Run this AFTER 20260420000001 has been committed (separate transaction).
-- The 'owner' enum value must exist before policies can reference it.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_read_reservations' AND tablename = 'reservations') THEN
    CREATE POLICY "owner_read_reservations" ON public.reservations FOR SELECT USING (public.has_role(auth.uid(), 'owner'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_read_room_types' AND tablename = 'room_types') THEN
    CREATE POLICY "owner_read_room_types" ON public.room_types FOR SELECT USING (public.has_role(auth.uid(), 'owner'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_read_room_units' AND tablename = 'room_units') THEN
    CREATE POLICY "owner_read_room_units" ON public.room_units FOR SELECT USING (public.has_role(auth.uid(), 'owner'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_read_hotel_settings' AND tablename = 'hotel_settings') THEN
    CREATE POLICY "owner_read_hotel_settings" ON public.hotel_settings FOR SELECT USING (public.has_role(auth.uid(), 'owner'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_update_hotel_settings' AND tablename = 'hotel_settings') THEN
    CREATE POLICY "owner_update_hotel_settings" ON public.hotel_settings FOR UPDATE USING (public.has_role(auth.uid(), 'owner'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_read_user_roles' AND tablename = 'user_roles') THEN
    CREATE POLICY "owner_read_user_roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'owner'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_update_user_roles' AND tablename = 'user_roles') THEN
    CREATE POLICY "owner_update_user_roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'owner'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_insert_user_roles' AND tablename = 'user_roles') THEN
    CREATE POLICY "owner_insert_user_roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'owner'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'owner_read_profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "owner_read_profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'owner'));
  END IF;

END $$;
