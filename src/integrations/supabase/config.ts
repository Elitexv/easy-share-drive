type ImportMetaEnv = Record<string, string | boolean | undefined>;

function readEnvValue(...names: string[]) {
  const env = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}) as ImportMetaEnv;

  for (const name of names) {
    const value = env[name];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

export function getSupabaseConfig() {
  const url = readEnvValue('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const publishableKey = readEnvValue(
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_ANON_KEY',
  );
  const serviceRoleKey = readEnvValue('SUPABASE_SERVICE_ROLE_KEY');
  const projectId = readEnvValue('SUPABASE_PROJECT_ID', 'VITE_SUPABASE_PROJECT_ID');

  return {
    url,
    publishableKey,
    serviceRoleKey,
    projectId,
  };
}
