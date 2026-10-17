"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// Public by design (it is embedded in the page); the secret half is server-only.
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type TurnstileApi = { reset: () => void };

/**
 * Drop inside a <form>. Writes the page-load time into `startedAt` and, when a
 * Turnstile site key is configured, renders the widget, which adds the
 * `cf-turnstile-response` field itself. Verification happens in
 * lib/bot-defence.ts on the server. Pass the action state as `resetOn`: a
 * Turnstile token is single-use, so the widget must re-arm after every submit.
 */
export default function BotCheck({ resetOn }: { resetOn: unknown }) {
  const input = useRef<HTMLInputElement>(null);
  const loadedAt = useRef(0);

  // After every submit React 19 resets uncontrolled form fields and the
  // Turnstile token is spent, so re-arm both. The timestamp stays the original
  // page-load time, not "now", or a retry would look too quick.
  useEffect(() => {
    if (!loadedAt.current) loadedAt.current = Date.now();
    if (input.current) input.current.value = String(loadedAt.current);
    (window as unknown as { turnstile?: TurnstileApi }).turnstile?.reset();
  }, [resetOn]);

  return (
    <>
      <input ref={input} type="hidden" name="startedAt" defaultValue="" />
      {siteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div className="cf-turnstile" data-sitekey={siteKey} data-theme="dark" />
        </>
      )}
    </>
  );
}
