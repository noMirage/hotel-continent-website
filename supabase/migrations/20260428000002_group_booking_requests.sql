CREATE TABLE IF NOT EXISTS public.group_booking_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name  TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_email TEXT,
  check_in    DATE NOT NULL,
  check_out   DATE NOT NULL,
  num_guests  INTEGER NOT NULL CHECK (num_guests > 0),
  wishes      TEXT,
  status      TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','in_progress','resolved','declined')),
  admin_notes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_group_booking_requests"
  ON public.group_booking_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_all_group_booking_requests"
  ON public.group_booking_requests FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);
