-- Allow Owner role to grant/manage roles (same as super_admin)
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

  IF v_caller_role NOT IN ('super_admin', 'owner') THEN
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
