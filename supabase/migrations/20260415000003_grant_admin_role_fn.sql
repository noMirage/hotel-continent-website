-- Function callable by Super Admins to grant a role to any existing Supabase user by email.
-- Runs as SECURITY DEFINER (postgres), so it can read auth.users.
-- Checks that the caller is a super_admin before doing anything.

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
  -- Verify caller is a super_admin
  SELECT role INTO v_caller_role
  FROM public.user_roles
  WHERE user_id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RETURN 'PERMISSION_DENIED';
  END IF;

  -- Look up the target user by email in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RETURN 'USER_NOT_FOUND';
  END IF;

  -- Insert or update role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) THEN
    UPDATE public.user_roles SET role = p_role WHERE user_id = v_user_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, p_role);
  END IF;

  RETURN 'SUCCESS';
END;
$$;
