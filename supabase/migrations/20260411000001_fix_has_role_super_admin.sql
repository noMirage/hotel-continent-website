-- Fix: Update has_role() to treat super_admin as having all admin privileges
-- This is the root cause of admin panel writes not saving —
-- super_admin users fail the has_role(uid, 'admin') check.

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id
          AND (
            role = _role
            -- super_admin inherits all admin privileges
            OR (_role = 'admin' AND role = 'super_admin')
          )
    )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Also fix: Admins can delete reservations (needed for calendar cancel)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'reservations'
          AND policyname = 'Admins can delete reservations'
    ) THEN
        CREATE POLICY "Admins can delete reservations"
            ON public.reservations FOR DELETE
            TO authenticated
            USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Fix: Public can view room_types including inactive ones when authenticated
-- (needed for admin room management page to show all rooms)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'room_types'
          AND policyname = 'Admins can view all room types'
    ) THEN
        CREATE POLICY "Admins can view all room types"
            ON public.room_types FOR SELECT
            TO authenticated
            USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Fix: Admins can view all room units (including inactive)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'room_units'
          AND policyname = 'Admins can view all room units'
    ) THEN
        CREATE POLICY "Admins can view all room units"
            ON public.room_units FOR SELECT
            TO authenticated
            USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;
