DO $$
BEGIN
  CREATE POLICY "files_bucket_select_own" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "files_bucket_insert_own" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "files_bucket_update_own" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "files_bucket_delete_own" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;

SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'files_bucket_%';
