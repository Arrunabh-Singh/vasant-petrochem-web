/// <reference lib="deno.ns" />

// Supabase Edge Function (Deno). Triggered by app/api/etl/upload after
// the office box stages an AES-256-GCM-encrypted Tally delta XML object
// in the `etl-inbox` bucket (see 20260816120022_tally_etl_key.sql for
// why AES-GCM, not age, for this leg). Decrypts, parses, upserts into
// the `finance` schema, and writes one finance.etl_run_log row per run —
// THREAT_MODEL.md R1's "no silent failures."
//
// Uses a direct Postgres connection (DB_URL secret), not the Supabase
// REST client, for every database read/write: PostgREST only exposes
// schemas on the project's "Exposed schemas" allowlist (public by
// default), and finance/vault_key_for live outside that by design (see
// 20260816120021's header comment) -- a direct connection sidesteps the
// restriction entirely rather than wrapping every finance write as a
// public-schema RPC. Storage access stays on the Supabase client, since
// bucket downloads are a separate API with no such restriction.
// `supabase secrets set DB_URL=...` before deploying this function.
//
// UNTESTABLE ON THIS MACHINE: Tally won't run on macOS, so the XML shape
// below is written against Tally's documented TDL Collection export
// format, not verified against a real export. Treat the parsing section
// as a first draft to correct against real Tally output on the office
// box (tools/office-box/README.md's setup steps end with that check).

import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3";
import { XMLParser } from "npm:fast-xml-parser@4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DB_URL = Deno.env.get("DB_URL")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

async function notifyTelegram(title: string, body: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log(`[notify] ${title} — ${body}`);
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `[ETL] ${title}\n\n${body}` }),
    });
  } catch (err) {
    console.error("notifyTelegram failed:", err);
  }
}

async function decryptAesGcm(blob: Uint8Array, keyBase64: string): Promise<Uint8Array> {
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const nonce = blob.slice(0, 12);
  // Web Crypto expects the auth tag appended to the ciphertext, not
  // separated — lib/crypto.ts's format (nonce ‖ tag ‖ ciphertext) needs
  // reordering to (ciphertext ‖ tag) for this API.
  const tag = blob.slice(12, 28);
  const ciphertext = blob.slice(28);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, combined);
  return new Uint8Array(plain);
}

// Tally TDL Collection export shape (documented, unverified against a
// real instance): ENVELOPE > BODY > DATA > TALLYMESSAGE[] each holding
// one VOUCHER / LEDGER / STOCKITEM keyed by a GUID attribute.
type TallyMessage = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "object") return (value as Record<string, unknown>)["#text"] as string ?? null;
  return String(value);
}

function num(value: unknown): number | null {
  const t = text(value);
  if (t == null) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req: Request) => {
  const storage = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const sql = postgres(DB_URL, { max: 1 });

  const { path } = await req.json().catch(() => ({ path: null }));
  if (!path) return new Response(JSON.stringify({ error: "path is required" }), { status: 400 });

  const [{ id: runId }] = await sql`insert into finance.etl_run_log (source) values ('tally') returning id`;

  let rowsProcessed = 0;
  let mismatches = 0;

  try {
    const { data: blob, error: dlErr } = await storage.storage.from("etl-inbox").download(path);
    if (dlErr || !blob) throw new Error(`download failed: ${dlErr?.message ?? "no data"}`);

    const [{ vault_key_for: key }] = await sql`select vault_key_for('tally-etl')`;
    if (!key) throw new Error("vault key fetch failed: no key returned");

    const encrypted = new Uint8Array(await blob.arrayBuffer());
    const plainXml = new TextDecoder().decode(await decryptAesGcm(encrypted, key));

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });
    const doc = parser.parse(plainXml);
    const messages = asArray<TallyMessage>(doc?.ENVELOPE?.BODY?.DATA?.TALLYMESSAGE);

    for (const msg of messages) {
      const ledger = msg.LEDGER as Record<string, unknown> | undefined;
      const item = msg.STOCKITEM as Record<string, unknown> | undefined;
      const voucher = msg.VOUCHER as Record<string, unknown> | undefined;

      if (ledger) {
        const guid = text((ledger as Record<string, unknown>)["@_GUID"] ?? ledger.GUID);
        if (!guid) { mismatches++; continue; }
        try {
          await sql`
            insert into finance.ledger (tally_guid, name, ledger_type, gstin, opening_balance)
            values (${guid}, ${text(ledger.NAME) ?? "unknown"}, 'other', ${text(ledger.PARTYGSTIN)}, ${num(ledger.OPENINGBALANCE) ?? 0})
            on conflict (tally_guid) do update set
              name = excluded.name, gstin = excluded.gstin, opening_balance = excluded.opening_balance, updated_at = now()
          `;
          rowsProcessed++;
        } catch { mismatches++; }
      }

      if (item) {
        const guid = text((item as Record<string, unknown>)["@_GUID"] ?? item.GUID);
        if (!guid) { mismatches++; continue; }
        try {
          await sql`
            insert into finance.item (tally_guid, name, unit, gst_hsn)
            values (${guid}, ${text(item.NAME) ?? "unknown"}, ${text(item.BASEUNITS)}, ${text(item.HSNCODE)})
            on conflict (tally_guid) do update set
              name = excluded.name, unit = excluded.unit, gst_hsn = excluded.gst_hsn, updated_at = now()
          `;
          rowsProcessed++;
        } catch { mismatches++; }
      }

      if (voucher) {
        const guid = text((voucher as Record<string, unknown>)["@_GUID"] ?? voucher.GUID);
        const voucherDate = text(voucher.DATE);
        const amount = num(voucher.AMOUNT);
        if (!guid || !voucherDate || amount == null) { mismatches++; continue; }
        try {
          await sql`
            insert into finance.voucher (tally_guid, voucher_type, voucher_number, voucher_date, amount, gst_tax_amount)
            values (${guid}, ${text(voucher.VOUCHERTYPENAME) ?? "unknown"}, ${text(voucher.VOUCHERNUMBER)}, ${voucherDate}, ${amount}, 0)
            on conflict (tally_guid) do update set
              voucher_type = excluded.voucher_type, voucher_number = excluded.voucher_number,
              voucher_date = excluded.voucher_date, amount = excluded.amount, updated_at = now()
          `;
          rowsProcessed++;
        } catch { mismatches++; }
      }
    }

    await sql`
      update finance.etl_run_log
      set status = 'ok', finished_at = now(), rows_processed = ${rowsProcessed}, mismatches = ${mismatches}
      where id = ${runId}
    `;

    // R1 in THREAT_MODEL.md: "no silent failures" — surface mismatches
    // even on an otherwise-successful run.
    if (mismatches > 0) {
      await notifyTelegram("Tally sync had mismatches", `${mismatches} of ${messages.length} rows didn't parse cleanly. Check finance.etl_run_log id=${runId}.`);
    }

    await sql.end();
    return new Response(JSON.stringify({ ok: true, rowsProcessed, mismatches }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sql`
      update finance.etl_run_log
      set status = 'failed', finished_at = now(), rows_processed = ${rowsProcessed}, mismatches = ${mismatches}, error = ${message}
      where id = ${runId}
    `;

    // blueprint P1 exit criteria: alert on 2 consecutive missed nights.
    const recent = await sql`select status from finance.etl_run_log order by started_at desc limit 2`;
    if (recent.length === 2 && recent.every((r) => r.status === "failed")) {
      await notifyTelegram("Tally sync failed twice in a row", `Latest error: ${message}`);
    }

    await sql.end();
    return new Response(JSON.stringify({ ok: false, error: message }), { status: 500 });
  }
});
