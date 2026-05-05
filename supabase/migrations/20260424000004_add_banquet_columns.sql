-- Allow banquet bookings that have no room assignment
ALTER TABLE reservations ALTER COLUMN room_unit_id DROP NOT NULL;

-- Booking type discriminator
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'room';
-- 'room' | 'banquet'

-- Banquet-specific fields
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS event_type       TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS guests_count     INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS has_accommodation BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS has_menu         BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS has_decor        BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS has_music        BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS budget           TEXT;
