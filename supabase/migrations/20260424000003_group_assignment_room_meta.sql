ALTER TABLE group_booking_room_assignments
  ADD COLUMN IF NOT EXISTS check_in_override  date,
  ADD COLUMN IF NOT EXISTS check_out_override date,
  ADD COLUMN IF NOT EXISTS room_notes         text;
