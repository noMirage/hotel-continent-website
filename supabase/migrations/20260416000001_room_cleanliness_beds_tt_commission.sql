-- ── 1. room_units: cleanliness status + bed configuration ────────────────────
ALTER TABLE room_units
  ADD COLUMN IF NOT EXISTS cleanliness_status TEXT NOT NULL DEFAULT 'clean'
    CHECK (cleanliness_status IN ('clean', 'dirty', 'under_renovation')),
  ADD COLUMN IF NOT EXISTS bed_config TEXT
    CHECK (bed_config IN ('double_bed', 'twin_beds'));

-- ── 2. hotel_settings: tourist tax rate ───────────────────────────────────────
ALTER TABLE hotel_settings
  ADD COLUMN IF NOT EXISTS tourist_tax_rate NUMERIC NOT NULL DEFAULT 41.5;

-- ── 3. reservations: store tourist tax amount per booking ─────────────────────
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS tourist_tax_amount NUMERIC NOT NULL DEFAULT 0;

-- ── 4. profiles: per-admin commission rates ───────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS commission_rate_manual NUMERIC NOT NULL DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS commission_rate_site   NUMERIC NOT NULL DEFAULT 3.0;
