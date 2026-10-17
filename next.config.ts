import type { NextConfig } from "next";

// audit.md H4 / I-16 / I-17: production had no CSP, no clickjacking
// protection, and no MIME-sniffing protection. script-src keeps
// 'unsafe-inline' for the JSON-LD blocks (see M14 for the escaping fix
// that makes those blocks safe to inline) and 'unsafe-eval' because
// framer-motion needs it in some browsers; tighten further only after
// confirming the Google OAuth redirect and framer-motion still work.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // VP-SEC-001. Vercel only adds a bare `max-age` HSTS; set the full
          // policy here so it does not depend on the host. includeSubDomains
          // forces HTTPS on every subdomain, so any future subdomain must
          // serve TLS. `preload` only declares eligibility — listing on
          // hstspreload.org is a separate, hard-to-undo owner decision.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
