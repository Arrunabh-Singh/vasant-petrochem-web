// @ts-check
import { defineConfig, envField } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://www.vasantpetrochem.com",
  // /about, never /about/: pages build as about.html and the Worker's asset
  // handler serves them without the extension (wrangler.jsonc).
  trailingSlash: "never",
  build: { format: "file", inlineStylesheets: "never" },
  // Pages prerender in Node at build time; only routes that opt out with
  // `prerender = false` (the enquiry endpoints, the offers board) run in the Worker.
  adapter: cloudflare({ imageService: "compile", prerenderEnvironment: "node" }),
  // No server sessions: the quote list lives on the buyer's device, so no KV store is provisioned.
  session: false,
  // Runtime configuration. Secrets are read in the Worker at request time and
  // never bundled; they are set in the Cloudflare dashboard (or .dev.vars locally).
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      SUPABASE_PUBLISHABLE_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      SITE_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: "client", access: "public", optional: true }),
      RESEND_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      MAIL_FROM: envField.string({ context: "server", access: "secret", optional: true }),
      SALES_EMAIL_TO: envField.string({ context: "server", access: "secret", optional: true }),
      IP_HASH_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
      /** "1" forces a dry run (validated, answered, never stored or emailed). Off the live host it is always a dry run (server/http.ts isLive). */
      RFQ_DRY_RUN: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
  compressHTML: true,
  devToolbar: { enabled: false },
  vite: {
    // content/ and design-system/ live beside the app, one level up.
    server: { fs: { allow: [".."] } },
    build: {
      // Never inline scripts or assets into the page: the strict CSP allows
      // only files from this origin (src/server/headers.ts).
      assetsInlineLimit: 0,
      // The browsers we support. Without them the CSS minifier folds
      // animation-timeline into the animation shorthand, which browsers
      // reject, and every scroll-driven scene silently stops.
      cssTarget: ["chrome115", "edge115", "safari17", "firefox128", "ios17"],
    },
  },
});
