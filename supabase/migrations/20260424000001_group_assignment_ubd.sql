ALTER TABLE group_booking_room_assignments
  ADD COLUMN IF NOT EXISTS ubd_documents text[] NOT NULL DEFAULT '{}';
