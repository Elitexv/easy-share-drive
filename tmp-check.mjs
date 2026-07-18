import { describeSupabaseError } from './src/integrations/supabase/error.ts';

console.log(describeSupabaseError({ message: 'Bucket not found' }, 'Upload failed'));
console.log(describeSupabaseError({ message: 'relation "public.files" does not exist' }, 'Could not load your files'));
