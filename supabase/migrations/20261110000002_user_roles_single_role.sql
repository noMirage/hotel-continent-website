-- One role per user.
--
-- user_roles had UNIQUE(user_id, role), so a user could end up with two rows (e.g. an owner
-- inserting a second role instead of updating). The admin app reads the role with
-- .maybeSingle(), which throws on two rows and locks that user out of the panel.
-- Keep the most privileged row per user and enforce UNIQUE(user_id) from now on.

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id
           ORDER BY CASE role::text
                      WHEN 'super_admin' THEN 1
                      WHEN 'owner'       THEN 2
                      WHEN 'admin'       THEN 3
                      WHEN 'viewer'      THEN 4
                      ELSE 5
                    END,
                    created_at
         ) AS rn
  FROM public.user_roles
)
DELETE FROM public.user_roles
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
