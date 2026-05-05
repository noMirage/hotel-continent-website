-- Extra accommodation (folding bed) support
-- Adds per-room enable/max settings and per-assignment count

-- Room units: whether extra beds are allowed and how many
ALTER TABLE room_units
  ADD COLUMN IF NOT EXISTS extra_accommodation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extra_accommodation_max     integer NOT NULL DEFAULT 0;

-- Group booking room assignments: how many extra beds were allocated
ALTER TABLE group_booking_room_assignments
  ADD COLUMN IF NOT EXISTS extra_accommodation integer NOT NULL DEFAULT 0;
