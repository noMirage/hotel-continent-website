-- Make guest_email nullable so phone-only bookings are supported
ALTER TABLE public.reservations ALTER COLUMN guest_email DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN guest_email SET DEFAULT NULL;

-- Guest-name assignments per room for group bookings
CREATE TABLE IF NOT EXISTS public.group_booking_room_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_booking_id uuid NOT NULL REFERENCES public.group_bookings(id) ON DELETE CASCADE,
  room_unit_id uuid NOT NULL REFERENCES public.room_units(id) ON DELETE CASCADE,
  guest_names text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(group_booking_id, room_unit_id)
);

CREATE OR REPLACE TRIGGER update_group_booking_room_assignments_updated_at
  BEFORE UPDATE ON public.group_booking_room_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.group_booking_room_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'group_room_assign_admins' AND tablename = 'group_booking_room_assignments') THEN
    CREATE POLICY "group_room_assign_admins" ON public.group_booking_room_assignments
      FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'viewer') OR
        public.has_role(auth.uid(), 'owner')
      );
  END IF;
END $$;
