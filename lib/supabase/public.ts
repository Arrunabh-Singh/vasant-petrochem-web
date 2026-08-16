import { createClient } from "@supabase/supabase-js";

/**
 * Stateless client for anonymous reads/writes (product catalog, quote
 * submissions, TDS request logging). No cookie handling, so it's safe to
 * call from generateStaticParams and other build-time/static contexts.
 * Admin (session-bound) operations use lib/supabase/server.ts instead.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
