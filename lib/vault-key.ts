import { createAdminClient } from "./supabase/admin";
import type { DocClass } from "./document-policy";

/**
 * Fetches a class's AES-256-GCM data key from Supabase Vault via the
 * vault_key_for() RPC, per request. Deliberately not cached in a
 * module-level variable — a Vercel Fluid Compute instance can be reused
 * across many requests/users, and holding the keyring statically would
 * turn one compromised instance into "every crown-jewel key, forever"
 * instead of "one request's worth of decrypt capability."
 */
export async function fetchVaultKey(docClass: DocClass): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("vault_key_for", { p_class: docClass });
  if (error || !data) {
    throw new Error(`vault key fetch failed for ${docClass}: ${error?.message ?? "no key returned"}`);
  }
  return data as string;
}
