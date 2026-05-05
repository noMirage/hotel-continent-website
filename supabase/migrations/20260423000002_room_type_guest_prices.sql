CREATE TABLE room_type_guest_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  guest_count INTEGER NOT NULL CHECK (guest_count >= 1),
  price_per_night DECIMAL(10,2) NOT NULL CHECK (price_per_night >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_type_id, guest_count)
);

ALTER TABLE room_type_guest_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage guest prices"
  ON room_type_guest_prices FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'owner')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Public read guest prices"
  ON room_type_guest_prices FOR SELECT TO public
  USING (true);
