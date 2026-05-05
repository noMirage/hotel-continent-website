-- room_type_guest_prices was created after the viewer policies migration
-- (20260415000004_viewer_read_policies.sql) so it was never included.
-- Viewer needs SELECT to render pricing in ManualBookingDialog and CalendarGroupDialog.
-- Pattern matches the existing viewer policies exactly.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Viewers can view guest prices'
      AND tablename = 'room_type_guest_prices'
  ) THEN
    CREATE POLICY "Viewers can view guest prices"
      ON public.room_type_guest_prices FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'viewer'
        )
      );
  END IF;
END $$;
