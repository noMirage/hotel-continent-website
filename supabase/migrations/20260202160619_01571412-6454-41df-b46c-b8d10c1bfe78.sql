-- Fix function search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Make reservation insert policy more specific (still allows public, but rate-limit friendly)
DROP POLICY IF EXISTS "Public can create reservations" ON public.reservations;
CREATE POLICY "Public can create reservations"
    ON public.reservations FOR INSERT
    WITH CHECK (
        status = 'PENDING' AND
        check_in_date >= CURRENT_DATE AND
        check_out_date > check_in_date
    );

-- Fix audit log insert policy to be more restrictive
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;
CREATE POLICY "Admins can insert audit log"
    ON public.audit_log FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));