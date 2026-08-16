import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Server-only, and only for the one
 * thing that genuinely needs it: issuing signed URLs into the private `tds`
 * bucket for anonymous visitors who aren't logged in as admin. Never import
 * this from a Client Component or anywhere the key could leak to the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Get it from Supabase Dashboard > Project Settings > API and add it to .env.local."
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
