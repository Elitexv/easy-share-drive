type SupabaseLikeError = {
  message?: string;
  code?: string;
  status?: number;
};

function normalizeError(error: unknown): SupabaseLikeError | null {
  if (!error) return null;
  if (typeof error === 'string') return { message: error };
  if (typeof error === 'object' && 'message' in error) {
    const e = error as Record<string, unknown>;
    const message = typeof e.message === 'string' ? e.message : undefined;
    const code = typeof e.code === 'string' ? e.code : undefined;
    const status = typeof e.status === 'number' ? e.status : undefined;
    return message ? { message, code, status } : null;
  }
  return null;
}

export function describeSupabaseError(error: unknown, fallback: string) {
  const normalized = normalizeError(error);
  if (!normalized?.message) return fallback;

  const message = normalized.message.toLowerCase();

  if (message.includes('bucket') || message.includes('storage')) {
    return `${fallback}: the Supabase storage bucket is not ready yet. Make sure the "files" bucket exists and its policies allow your signed-in user to upload and read files.`;
  }

  if (message.includes('relation') || message.includes('does not exist') || message.includes('schema')) {
    return `${fallback}: the Supabase database schema is incomplete. Apply the project migrations for profiles, folders, files, shares, and the RPC helpers.`;
  }

  if (message.includes('permission denied') || message.includes('policy')) {
    return `${fallback}: Supabase permissions are blocking this action. Check the storage and table policies for this project.`;
  }

  if (message.includes('jwt') || message.includes('token') || message.includes('auth')) {
    return `${fallback}: authentication is not available for this request. Sign in again and verify the Supabase auth setup.`;
  }

  return fallback;
}
