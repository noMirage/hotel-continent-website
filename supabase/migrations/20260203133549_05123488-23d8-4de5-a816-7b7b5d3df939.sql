-- Allow super_admins to manage user_roles
CREATE POLICY "Super admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Add commission_rate to profiles for admin statistics
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 3.0;

-- Allow admins to view all profiles (for super admin management)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Allow super admins to update any profile
CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

-- Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = 'super_admin'
    )
$$;