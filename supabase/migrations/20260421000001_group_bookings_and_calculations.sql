-- Group Calculations: store pricing formulas for group stays
CREATE TABLE IF NOT EXISTS public.group_calculations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price_per_person_per_night numeric(10,2) NOT NULL DEFAULT 0,
  created_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Services attached to a calculation (meals, etc.)
CREATE TABLE IF NOT EXISTS public.group_calculation_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  calculation_id uuid NOT NULL REFERENCES public.group_calculations(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  cost numeric(10,2),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Group Bookings
CREATE TABLE IF NOT EXISTS public.group_bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_name text NOT NULL,
  contact_person text NOT NULL,
  phone text,
  num_guests integer NOT NULL,
  room_unit_ids uuid[] NOT NULL DEFAULT '{}',
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  admin_notes text,
  calculation_id uuid REFERENCES public.group_calculations(id) ON DELETE SET NULL,
  custom_total numeric(10,2),
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  created_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT group_bookings_num_guests_check CHECK (num_guests >= 5)
);

-- updated_at triggers
CREATE OR REPLACE TRIGGER update_group_calculations_updated_at
  BEFORE UPDATE ON public.group_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_group_bookings_updated_at
  BEFORE UPDATE ON public.group_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.group_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_calculation_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'group_calc_admins' AND tablename = 'group_calculations') THEN
    CREATE POLICY "group_calc_admins" ON public.group_calculations
      FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'viewer') OR
        public.has_role(auth.uid(), 'owner')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'group_calc_svc_admins' AND tablename = 'group_calculation_services') THEN
    CREATE POLICY "group_calc_svc_admins" ON public.group_calculation_services
      FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'viewer') OR
        public.has_role(auth.uid(), 'owner')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'group_bookings_admins' AND tablename = 'group_bookings') THEN
    CREATE POLICY "group_bookings_admins" ON public.group_bookings
      FOR ALL USING (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'viewer') OR
        public.has_role(auth.uid(), 'owner')
      );
  END IF;
END $$;
