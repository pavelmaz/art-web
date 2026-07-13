import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only data client. Uses the service-role key so the public `anon` SELECT grant
 * can be revoked — which stops direct PostgREST scraping of the dataset — without
 * breaking server rendering. The `server-only` import makes any accidental Client
 * Component import fail the build, so the service key can never leak to the browser.
 *
 * Auth (login) still uses the anon key via lib/supabase/browser + lib/supabase/server;
 * revoking anon table SELECT does not affect the auth endpoints.
 *
 * The client is created LAZILY (on first use) instead of at module load. Importing this
 * file during `next build` (the "collect page data" step evaluates every route module)
 * therefore never calls createClient, so a build can't crash with "supabaseKey is
 * required" when the env vars aren't present at build time — e.g. Preview deployments
 * that only carry the Production keys. At runtime the real env is present and the client
 * is created on first query. The exported `supabase` stays a value (a Proxy), so every
 * existing `supabase.from(...)` / `supabase.auth` / `supabase.storage` call is unchanged.
 */
let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "lib/supabase: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set at runtime.",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
