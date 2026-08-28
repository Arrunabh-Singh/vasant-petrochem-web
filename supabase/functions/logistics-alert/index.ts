// logistics-alert — daily shipment alert push (e-way expiry / overdue delivery).
// Deployed as a Supabase Edge Function, invoked by pg_cron (or manually).
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically by Supabase.
// Telegram push is optional: set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID as function
// secrets; with neither set the function just reports the count (graceful degrade).

const EWAY_WINDOW_DAYS = 3;

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!supabaseUrl || !serviceRole) {
    return new Response(JSON.stringify({ error: "supabase env not configured" }), { status: 500 });
  }

  const now = Date.now();
  const windowMs = EWAY_WINDOW_DAYS * 86_400_000;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/logistics.shipment?select=id,shipment_no,eway_expiry,eta,status`,
    { headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` } }
  );
  if (!res.ok) {
    return new Response(JSON.stringify({ error: "shipment query failed", status: res.status }), { status: 502 });
  }
  const rows = await res.json();

  const lines: string[] = [];
  for (const r of rows as Array<{ shipment_no: string; eway_expiry: string | null; eta: string | null; status: string }>) {
    if (r.eway_expiry) {
      const e = new Date(r.eway_expiry).getTime();
      if (e <= now + windowMs) {
        const days = Math.ceil((e - now) / 86_400_000);
        lines.push(`⚠️ ${r.shipment_no}: e-way ${days < 0 ? "EXPIRED" : `expires in ${days}d`} (${r.eway_expiry})`);
      }
    }
    if (r.status && !["delivered", "returned"].includes(r.status) && r.eta) {
      const eta = new Date(r.eta).getTime();
      if (eta < now) {
        const days = Math.floor((now - eta) / 86_400_000);
        lines.push(`🚨 ${r.shipment_no}: delivery OVERDUE by ${days}d (ETA ${r.eta})`);
      }
    }
  }

  if (lines.length > 0 && telegramToken && telegramChatId) {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: `📦 Vasant Logistics Alerts (${lines.length})\n\n${lines.join("\n")}`,
      }),
    });
  }

  return new Response(JSON.stringify({ alerts: lines.length, sample: lines.slice(0, 10) }), {
    headers: { "Content-Type": "application/json" },
  });
});
