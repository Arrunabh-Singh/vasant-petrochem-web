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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
