"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeOrigin } from "@/lib/origin";

export async function signInWithGoogle() {
  // `origin` isn't reliably sent on a Server Action form POST — `host` is.
  // Behind Vercel's proxy the real host/protocol are in the
  // x-forwarded-* headers. audit.md M1: validate against a fixed
  // allowlist rather than trusting the header outright.
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto");
  const origin = safeOrigin(host, protocol);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/admin/login?error=oauth_failed");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
