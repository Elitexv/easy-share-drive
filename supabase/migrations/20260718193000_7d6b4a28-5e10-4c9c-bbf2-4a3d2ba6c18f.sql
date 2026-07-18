-- Create the Supabase storage bucket used by this app.
-- This bucket is required for uploads and storage operations.
DO $$
BEGIN
  PERFORM storage.create_bucket('files', '{"public": false}'::jsonb);
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%already exists%' THEN
    RAISE NOTICE 'Bucket "files" already exists.';
  ELSE
    RAISE;
  END IF;
END;
$$;
