import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedAdminEmail } from "@/lib/rbac";
import { safeOrigin } from "@/lib/origin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const flowId = searchParams.get("sb_flow_id") ?? undefined;
  // audit.md M17: all three redirects below used to reflect the raw
  // request origin (same class of bug as M1/M12, independently found).
  // Build the base from the fixed allowlist instead.
  const origin = safeOrigin(request.headers.get("x-forwarded-host") ?? request.headers.get("host"), request.headers.get("x-forwarded-proto"));

  if (code) {
    const supabase = await createClient();
    // audit.md M18: without flowId, @supabase/auth-js keeps one legacy
    // verifier key that two parallel sign-in tabs overwrite, locking the
    // admin out until a fresh attempt. Forwarding sb_flow_id (see
    // app/actions/auth.ts's appendPkceFlowIdToRedirects) binds each
    // callback to its own verifier.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);

    if (!error) {
      if (!(await isAllowedAdminEmail(data.user.email))) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/admin/login?error=not_authorized`);
      }
      return NextResponse.redirect(`${origin}/admin`);
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?error=oauth_failed`);
}
