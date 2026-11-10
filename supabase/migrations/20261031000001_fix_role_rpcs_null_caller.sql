-- Close a permission bypass in the role-management RPCs.
--
-- grant_admin_role and update_role_by_user_id checked the caller with
--   IF v_caller_role NOT IN ('super_admin', 'owner') THEN RETURN 'PERMISSION_DENIED';
-- For a caller with no user_roles row (anonymous, or any signed-in user without a role)
-- v_caller_role is NULL, `NULL NOT IN (...)` is NULL, the IF is skipped and the function
-- goes on to change roles. Both are SECURITY DEFINER and executable by anon by default.
--
-- Fix: treat a NULL role as denied, and only let signed-in users execute these functions.

CREATE OR REPLACE FUNCTION public.grant_admin_role(p_email TEXT, p_role public.app_role)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_caller_role public.app_role;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.user_roles
  WHERE user_id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'owner') THEN
    RETURN 'PERMISSION_DENIED';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RETURN 'USER_NOT_FOUND';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) THEN
    UPDATE public.user_roles SET role = p_role WHERE user_id = v_user_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, p_role);
  END IF;

  RETURN 'SUCCESS';
END;
$$;

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

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'owner') THEN
    RETURN 'PERMISSION_DENIED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id) THEN
    RETURN 'USER_NOT_FOUND';
  END IF;

  UPDATE public.user_roles SET role = p_role WHERE user_id = p_user_id;

  RETURN 'SUCCESS';
END;
$$;

REVOKE ALL ON FUNCTION public.grant_admin_role(TEXT, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_role_by_user_id(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_admin_role(TEXT, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_role_by_user_id(UUID, public.app_role) TO authenticated;
