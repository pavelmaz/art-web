import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Server-side Supabase client — avoids Next.js caching empty/failed hub RPC responses. */
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) =>
      fetch(url, {
        ...options,
        cache: "no-store",
      }),
  },
});
