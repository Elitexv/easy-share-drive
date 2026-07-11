
-- Role enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin can read everything policies (added alongside owner policies)
CREATE POLICY "admins_read_all_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_read_all_files" ON public.files
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_read_all_folders" ON public.folders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_read_all_shares" ON public.shares
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_delete_any_share" ON public.shares
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-grant admin to the very first signup so the panel is reachable
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Backfill: promote the earliest existing profile to admin, others to user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM public.profiles
ORDER BY created_at ASC LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user' FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT DO NOTHING;

-- Admin stats functions
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS TABLE(total_users bigint, total_files bigint, total_shares bigint, total_storage_bytes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.files WHERE is_trashed = false),
    (SELECT COUNT(*) FROM public.shares),
    COALESCE((SELECT SUM(size_bytes) FROM public.files WHERE is_trashed = false), 0)::bigint
  WHERE public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  storage_quota_bytes bigint,
  storage_used_bytes bigint,
  file_count bigint,
  share_count bigint,
  is_admin boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.email, p.full_name, p.avatar_url, p.created_at, p.storage_quota_bytes,
    COALESCE((SELECT SUM(size_bytes) FROM public.files f WHERE f.user_id = p.id AND f.is_trashed = false), 0)::bigint,
    (SELECT COUNT(*) FROM public.files f WHERE f.user_id = p.id AND f.is_trashed = false),
    (SELECT COUNT(*) FROM public.shares s WHERE s.created_by = p.id),
    public.has_role(p.id, 'admin')
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_shares()
RETURNS TABLE(
  share_id uuid,
  token text,
  permission text,
  expires_at timestamptz,
  view_count int,
  created_at timestamptz,
  file_id uuid,
  file_name text,
  file_size bigint,
  owner_id uuid,
  owner_email text,
  owner_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.token, s.permission, s.expires_at, s.view_count, s.created_at,
         f.id, f.name, f.size_bytes,
         p.id, p.email, p.full_name
  FROM public.shares s
  JOIN public.files f ON f.id = s.file_id
  LEFT JOIN public.profiles p ON p.id = s.created_by
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_share(_share_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.shares WHERE id = _share_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id uuid, _role public.app_role, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;
END;
$$;
