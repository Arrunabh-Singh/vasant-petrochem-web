import { site } from "../app/content.ts";

/**
 * audit.md M1 / M12 / M17: three independent places built a redirect
 * origin from request-derived headers (x-forwarded-host / host). On
 * Vercel that header is proxy-set and trustworthy, but off Vercel — or if
 * the proxy config ever changes — it's attacker-influenceable, enabling
 * OAuth code exfiltration via a forged Host header. Validate against a
 * fixed allowlist instead of trusting the header.
 */
const ALLOWED_ORIGINS = [site.url, "https://vasant-petrochem-web.vercel.app", "http://localhost:3000"];

export function safeOrigin(host: string | null, protocol: string | null): string {
  const candidate = host ? `${protocol ?? "https"}://${host}` : null;
  if (candidate && ALLOWED_ORIGINS.includes(candidate)) {
    return candidate;
  }
  return site.url;
}
