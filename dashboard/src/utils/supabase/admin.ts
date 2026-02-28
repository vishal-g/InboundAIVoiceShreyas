import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client using the SERVICE_ROLE key.
 * This bypasses RLS entirely -- use ONLY on the server side for
 * admin dashboard data queries where the user is already authenticated.
 */
export function createAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}
