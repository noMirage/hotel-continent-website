-- Create booking source enum
CREATE TYPE public.booking_source AS ENUM ('SITE', 'ADMIN');

-- Add new tracking fields to reservations
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS booking_source public.booking_source DEFAULT 'SITE',
ADD COLUMN IF NOT EXISTS created_by_admin_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS confirmed_by_admin_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 3.0;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_reservations_created_by_admin ON public.reservations(created_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_reservations_confirmed_by_admin ON public.reservations(confirmed_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_reservations_booking_source ON public.reservations(booking_source);

-- Allow admins to create reservations (for manual bookings)
CREATE POLICY "Admins can create reservations"
ON public.reservations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));