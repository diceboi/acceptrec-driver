
import { createClient } from '@supabase/supabase-js'

// Note: This client uses the SERVICE_ROLE_KEY and should ONLY be used in server-side API routes.
// NEVER expose this client or the key to the browser.

export const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase Admin credentials");
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
