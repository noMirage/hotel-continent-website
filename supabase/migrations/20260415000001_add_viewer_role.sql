-- Add viewer role to app_role enum
-- Viewer: read-only access to Dashboard, Calendar, Bookings
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
