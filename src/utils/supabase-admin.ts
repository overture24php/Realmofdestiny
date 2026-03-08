/**
 * supabase-admin.ts
 * Creates an admin-level Supabase client using the Service Role Key.
 * The service role key is provided at runtime (stored in sessionStorage).
 * NEVER hardcode or expose the service role key in source code.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId } from '/utils/supabase/info';

export function createAdminClient(serviceRoleKey: string): SupabaseClient {
  return createClient(
    `https://${projectId}.supabase.co`,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
