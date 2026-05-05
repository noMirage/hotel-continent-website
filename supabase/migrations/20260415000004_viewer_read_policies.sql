-- Grant viewer role read-only SELECT access to the tables shown in Dashboard, Bookings, and Calendar.
-- Viewers cannot INSERT, UPDATE, or DELETE anything.

-- Reservations (Dashboard stats, Bookings list, Calendar)
CREATE POLICY "Viewers can view all reservations"
    ON public.reservations FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'viewer'
      )
    );

-- Guest forms (shown in booking detail / calendar dialog)
CREATE POLICY "Viewers can view guest forms"
    ON public.guest_forms FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'viewer'
      )
    );

-- Room types (needed for Calendar to show room names)
CREATE POLICY "Viewers can view room types"
    ON public.room_types FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'viewer'
      )
    );

-- Room units (needed for Calendar rows)
CREATE POLICY "Viewers can view room units"
    ON public.room_units FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'viewer'
      )
    );
