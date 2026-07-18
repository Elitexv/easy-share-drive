import test from 'node:test';
import assert from 'node:assert/strict';
import { describeSupabaseError } from '../src/integrations/supabase/error.ts';

test('explains missing storage bucket issues clearly', () => {
  const message = describeSupabaseError(
    { message: 'Bucket not found' },
    'Upload failed',
  );

  assert.match(message, /storage bucket/i);
  assert.match(message, /Upload failed/i);
});

test('explains missing database schema issues clearly', () => {
  const message = describeSupabaseError(
    { message: 'relation "public.files" does not exist' },
    'Could not load your files',
  );

  assert.match(message, /database schema/i);
  assert.match(message, /Could not load your files/i);
});

test('returns a concise fallback for unknown errors', () => {
  const message = describeSupabaseError('plain text', 'Could not complete that action');

  assert.equal(message, 'Could not complete that action');
});
