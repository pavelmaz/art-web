import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-only data client. Uses the service-role key so the public `anon` SELECT grant
 * can be revoked — which stops direct PostgREST scraping of the dataset — without
 * breaking server rendering. The `server-only` import makes any accidental Client
 * Component import fail the build, so the service key can never leak to the browser.
 *
 * Auth (login) still uses the anon key via lib/supabase/browser + lib/supabase/server;
 * revoking anon table SELECT does not affect the auth endpoints.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
