
-- Storage RLS: users can access only their own paths (user_id prefix)
CREATE POLICY "files_bucket_select_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "files_bucket_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "files_bucket_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "files_bucket_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Convert storage-used helper to SECURITY INVOKER (RLS handles scoping)
CREATE OR REPLACE FUNCTION public.get_storage_used(_user_id UUID) RETURNS BIGINT
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(SUM(size_bytes), 0)::BIGINT FROM public.files
  WHERE user_id = _user_id AND is_trashed = false;
$$;

-- Revoke public execute; handle_new_user runs only as trigger
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
