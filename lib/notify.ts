import { createAdminClient } from "./supabase/admin.ts";

export type NotifySeverity = "info" | "warning" | "critical";

/**
 * Decision 8: Telegram primary, Resend secondary, in-app always. Both
 * external channels are env-gated — with neither key set, this degrades
 * to a security_alerts row + a console log, so nothing in this wave
 * breaks before the owner creates the Telegram bot / Resend account
 * (docs/OWNER_CHECKLIST.md #8). Resend free tier has a 100/day cap, so
 * email can never be the sole path — it's the fallback, not the primary.
 */
export async function notify(severity: NotifySeverity, title: string, body: string): Promise<void> {
  let delivered = false;

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  if (telegramToken && telegramChatId) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramChatId, text: `[${severity.toUpperCase()}] ${title}\n\n${body}` }),
      });
      delivered = res.ok;
      if (!res.ok) console.error("notify: telegram send failed", res.status, await res.text());
    } catch (err) {
      console.error("notify: telegram send threw", err);
    }
  }

  if (!delivered && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Vasant Hub Alerts <alerts@vasantpetrochem.com>",
          to: [process.env.ALERT_EMAIL_TO ?? "vasantpetrochem@gmail.com"],
          subject: `[${severity}] ${title}`,
          text: body,
        }),
      });
      delivered = res.ok;
      if (!res.ok) console.error("notify: resend send failed", res.status, await res.text());
    } catch (err) {
      console.error("notify: resend send threw", err);
    }
  }

  try {
    const admin = createAdminClient();
    await admin.from("security_alerts").insert({ kind: title, detail: body, severity });
  } catch (err) {
    console.error("notify: could not write security_alerts row", err);
  }

  if (!delivered) {
    console.log(`[notify:${severity}] ${title} — ${body}`);
  }
}
