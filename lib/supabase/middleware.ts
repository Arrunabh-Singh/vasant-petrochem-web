import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminViaClient } from "@/lib/rbac";

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated visitors away from /admin. Required because Server
 * Components can't write cookies — only middleware and Route Handlers can.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // audit.md C4: @supabase/ssr defaults to httpOnly:false, no Secure,
      // 400-day maxAge — readable by any XSS payload and outlives a
      // revoked admin by over a year (proxy.ts only blocks the UI; the
      // Supabase API layer would still authenticate the stale cookie).
      cookieOptions: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24h
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginRoute = request.nextUrl.pathname === "/admin/login";
  const isAllowed = await isAdminViaClient(supabase, user?.email);

  if (isAdminRoute && !isLoginRoute && !isAllowed) {
    // Covers both no session and a session whose email was since removed
    // from the allowlist — sign out so a stale session can't linger.
    if (user) {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("signOut failed during admin gate:", error.message);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    const redirectResponse = NextResponse.redirect(url);
    // audit.md M13: signOut() clears cookies on the discarded
    // supabaseResponse above; a fresh NextResponse.redirect() here starts
    // with none of those clears, so the browser keeps the stale session
    // cookie client-side. Copy every cookie the signOut just cleared (or
    // any pending setAll from getUser's own refresh) onto the response
    // that actually gets sent.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  if (isLoginRoute && isAllowed) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
