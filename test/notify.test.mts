import { test } from "node:test";
import assert from "node:assert/strict";
import { notify } from "../lib/notify.ts";

const ENV_KEYS = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "RESEND_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

test("notify() degrades to a console log without throwing when no channel is configured", async () => {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];

  const originalLog = console.log;
  const originalError = console.error;
  let logged = "";
  console.log = (msg: string) => {
    logged += msg;
  };
  console.error = () => {}; // createAdminClient's expected throw is caught+logged internally; silence it here

  try {
    // decision 8: with neither Telegram nor Resend configured, and no
    // service-role key to even write a security_alerts row, this must
    // still resolve — never throw and break the caller's request.
    await assert.doesNotReject(() => notify("warning", "test title", "test body"));
    assert.match(logged, /test title/);
    assert.match(logged, /test body/);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});
