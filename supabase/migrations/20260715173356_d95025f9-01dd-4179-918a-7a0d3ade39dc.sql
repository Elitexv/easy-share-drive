
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.shares ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Owner sets/clears a share password
CREATE OR REPLACE FUNCTION public.set_share_password(_share_id uuid, _password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.shares WHERE id = _share_id AND created_by = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.shares
     SET password_hash = CASE
       WHEN _password IS NULL OR length(_password) = 0 THEN NULL
       ELSE crypt(_password, gen_salt('bf', 10))
     END
   WHERE id = _share_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_share_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_share_password(uuid, text) TO authenticated;

-- Returns metadata about a share link, enforcing expiration + password.
-- storage_path is only returned when the password (if any) has been supplied and matches.
-- status: 'ok' | 'not_found' | 'expired' | 'password_required' | 'password_invalid'
CREATE OR REPLACE FUNCTION public.resolve_share(_token text, _password text DEFAULT NULL)
RETURNS TABLE(
  status text,
  share_id uuid,
  file_id uuid,
  file_name text,
  file_size bigint,
  mime_type text,
  storage_path text,
  permission text,
  expires_at timestamptz,
  owner_name text,
  requires_password boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shares%ROWTYPE;
  f public.files%ROWTYPE;
  owner_full_name text;
  pass_ok boolean;
BEGIN
  SELECT * INTO s FROM public.shares WHERE token = _token;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::uuid, NULL::text, NULL::bigint, NULL::text, NULL::text, NULL::text, NULL::timestamptz, NULL::text, false;
    RETURN;
  END IF;

  IF s.expires_at IS NOT NULL AND s.expires_at <= now() THEN
    RETURN QUERY SELECT 'expired'::text, s.id, NULL::uuid, NULL::text, NULL::bigint, NULL::text, NULL::text, NULL::text, s.expires_at, NULL::text, (s.password_hash IS NOT NULL);
    RETURN;
  END IF;

  SELECT * INTO f FROM public.files WHERE id = s.file_id AND is_trashed = false;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, s.id, NULL::uuid, NULL::text, NULL::bigint, NULL::text, NULL::text, NULL::text, NULL::timestamptz, NULL::text, (s.password_hash IS NOT NULL);
    RETURN;
  END IF;

  SELECT p.full_name INTO owner_full_name FROM public.profiles p WHERE p.id = s.created_by;

  IF s.password_hash IS NOT NULL THEN
    IF _password IS NULL OR length(_password) = 0 THEN
      RETURN QUERY SELECT 'password_required'::text, s.id, f.id, f.name, f.size_bytes, f.mime_type,
                          NULL::text, s.permission, s.expires_at, owner_full_name, true;
      RETURN;
    END IF;
    pass_ok := (s.password_hash = crypt(_password, s.password_hash));
    IF NOT pass_ok THEN
      RETURN QUERY SELECT 'password_invalid'::text, s.id, f.id, f.name, f.size_bytes, f.mime_type,
                          NULL::text, s.permission, s.expires_at, owner_full_name, true;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT 'ok'::text, s.id, f.id, f.name, f.size_bytes, f.mime_type,
                      f.storage_path, s.permission, s.expires_at, owner_full_name,
                      (s.password_hash IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_share(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_share(text, text) TO anon, authenticated;

-- Increments view_count for an authorized access (called from server after successful signed-URL grant).
CREATE OR REPLACE FUNCTION public.increment_share_view(_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.shares SET view_count = view_count + 1 WHERE token = _token;
$$;

REVOKE ALL ON FUNCTION public.increment_share_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_share_view(text) TO anon, authenticated;

-- Deprecate old function: keep it but make it require the new signature so the client can't
-- fetch storage_path bypassing the password check.
CREATE OR REPLACE FUNCTION public.get_share_by_token(_token text)
RETURNS TABLE(
  share_id uuid, file_id uuid, file_name text, file_size bigint,
  mime_type text, storage_path text, permission text,
  expires_at timestamptz, owner_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.share_id, r.file_id, r.file_name, r.file_size, r.mime_type,
         r.storage_path, r.permission, r.expires_at, r.owner_name
  FROM public.resolve_share(_token, NULL) r
  WHERE r.status = 'ok' AND r.requires_password = false;
$$;
