-- Multi-room regular booking grouping
-- Links reservations created together into a visual group

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS booking_group_id uuid;
