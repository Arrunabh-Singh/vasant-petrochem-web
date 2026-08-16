/**
 * Google OAuth authenticates you as *a* Google account — it says nothing
 * about whether that account should have admin access. This allowlist is
 * the actual authorization check, enforced both right after login
 * (app/auth/callback) and on every request (proxy.ts), so revoking access
 * takes effect immediately rather than only at next sign-in.
 */
const ALLOWED_ADMIN_EMAILS = (process.env.ADMIN_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase());
}
