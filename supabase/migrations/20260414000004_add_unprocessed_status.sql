-- Add UNPROCESSED to booking_status enum
-- Used for reservations coming from the website that have not yet been reviewed by an admin
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'UNPROCESSED';
