import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";

/**
 * Replaces lib/admin-auth.ts. audit.md C1 step 4: the old allowlist was
 * env-only, so revoking access needed a redeploy. isAdminViaClient() now
 * checks public.app_users first — revocation is instant — and ORs in the
 * env allowlist as a break-glass fallback so a bad seed row can never lock
 * the owner out of the only admin account (Phase 1, decision 5).
 *
 * isAdminViaClient() takes the caller's own Supabase client instead of
 * constructing one, because the two callers live in incompatible contexts:
 * lib/supabase/middleware.ts (Edge middleware, request/response cookies)
 * and Server Components/Actions (lib/supabase/server.ts, next/headers
 * cookies()). Both produce the same @supabase/ssr client shape, so one
 * check works for both.
 */
const ENV_ALLOWED_ADMIN_EMAILS = (process.env.ADMIN_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isEnvAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;
  return ENV_ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function isAdminViaClient(
  supabase: SupabaseClient,
  email: string | null | undefined
): Promise<boolean> {
  if (!email) return false;
  if (isEnvAllowlisted(email)) return true;

  const { data } = await supabase
    .from("app_users")
    .select("role, is_active")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return Boolean(data?.is_active && data.role === "admin");
}

export async function isAllowedAdminEmail(email: string | null | undefined): Promise<boolean> {
  const supabase = await createClient();
  return isAdminViaClient(supabase, email);
}

export type CurrentAdmin = { email: string };

/** Throws if the caller isn't an admin. Call as the first line of every admin server action (audit.md M7). */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!(await isAdminViaClient(supabase, user?.email))) {
    throw new Error("Unauthorized");
  }

  const freeze = await activeFreeze(supabase);
  if (freeze) throw new Error(`System is in ${freeze} — writes are disabled.`);

  return { email: user!.email! };
}

/** F3 breach-mode or F4 holiday-mode — either one blocks admin writes. */
export async function activeFreeze(supabase?: SupabaseClient): Promise<"breach_mode" | "holiday_mode" | null> {
  const client = supabase ?? (await createClient());
  const { data } = await client.from("system_flags").select("key, value").in("key", ["breach_mode", "holiday_mode"]);
  const active = data?.find((f) => f.value === true);
  return (active?.key as "breach_mode" | "holiday_mode" | undefined) ?? null;
}

export async function isBreachModeFrozen(supabase?: SupabaseClient): Promise<boolean> {
  return (await activeFreeze(supabase)) === "breach_mode";
}
