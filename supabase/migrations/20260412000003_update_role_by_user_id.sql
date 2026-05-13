-- Companion to grant_admin_role: updates an existing user's role by UUID.
-- The direct .update() on user_roles from the client bypassed permission
-- checks and only worked for owner (RLS) but silently failed for super_admin.
-- This SECURITY DEFINER function enforces the same caller check as
-- grant_admin_role, and is keyed by user_id so the client never needs to
-- resolve the target user's email.

CREATE OR REPLACE FUNCTION public.update_role_by_user_id(
  p_user_id UUID,
  p_role    public.app_role
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.app_role;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.user_roles
  WHERE user_id = auth.uid();

  IF v_caller_role NOT IN ('super_admin', 'owner') THEN
    RETURN 'PERMISSION_DENIED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id) THEN
    RETURN 'USER_NOT_FOUND';
  END IF;

  UPDATE public.user_roles SET role = p_role WHERE user_id = p_user_id;

  RETURN 'SUCCESS';
END;
$$;
