ALTER TABLE group_booking_room_assignments
  ADD COLUMN IF NOT EXISTS extra_guest_names text[] NOT NULL DEFAULT '{}';
