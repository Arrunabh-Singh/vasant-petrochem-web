#!/usr/bin/env node
// Polls Tally Prime's server-mode HTTP interface (http://localhost:9000)
// for a delta export, encrypts it, and uploads it to the hub's ETL inbox.
// VASANT_HUB_BLUEPRINT.md decision 1 (pull model): this script runs on
// its own schedule on the always-on office box — mom's laptop never has
// to be awake for a sync to happen.
//
// UNTESTABLE ON macOS: Tally Prime doesn't run here. The XML request
// envelope below follows Tally's documented TDL HTTP export format
// (POST an <ENVELOPE> requesting a Collection, scoped by ALTERID for a
// delta), but it needs to be validated against a real Tally instance —
// see README.md's setup steps.
//
// Run with: node --env-file=.env tally-pull.mjs
// (Node 20.6+ supports --env-file natively; no dotenv dependency needed.)

import { createCipheriv, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(HERE, "state.json");
const QUEUE_DIR = join(HERE, "queue");

const TALLY_URL = process.env.TALLY_URL ?? "http://localhost:9000";
const HUB_URL = process.env.HUB_URL; // e.g. https://vasantpetrochem.com
const HUB_UPLOAD_TICKET = process.env.HUB_UPLOAD_TICKET; // minted via /api/documents/upload-ticket, classes: ["etl-inbox"]
const TALLY_ETL_ENCRYPTION_KEY = process.env.TALLY_ETL_ENCRYPTION_KEY; // base64, copied from Supabase Vault doc-key:tally-etl

function requireEnv() {
  const missing = ["HUB_URL", "HUB_UPLOAD_TICKET", "TALLY_ETL_ENCRYPTION_KEY"].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function loadState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch {
    return { lastAlterId: 0 };
  }
}

async function saveState(state) {
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

/** Tally TDL export request: a Collection of vouchers/ledgers/stock items altered since lastAlterId. */
function buildExportEnvelope(lastAlterId) {
  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vasant Hub Delta Export</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <ALTERIDGREATERTHAN>${lastAlterId}</ALTERIDGREATERTHAN>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
}

async function pullFromTally(lastAlterId) {
  const res = await fetch(TALLY_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: buildExportEnvelope(lastAlterId),
  });
  if (!res.ok) throw new Error(`Tally responded ${res.status}`);
  return await res.text();
}

/** AES-256-GCM: nonce(12) ‖ authTag(16) ‖ ciphertext — matches lib/crypto.ts's format. */
function encrypt(plaintext, keyBase64) {
  const key = Buffer.from(keyBase64, "base64");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([nonce, authTag, ciphertext]);
}

async function uploadEncrypted(encryptedBuffer, filename) {
  const form = new FormData();
  form.set("file", new Blob([encryptedBuffer], { type: "application/octet-stream" }), filename);

  const res = await fetch(`${HUB_URL}/api/etl/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${HUB_UPLOAD_TICKET}` },
    body: form,
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function flushQueue() {
  await mkdir(QUEUE_DIR, { recursive: true });
  const files = await readdir(QUEUE_DIR);
  for (const file of files) {
    const path = join(QUEUE_DIR, file);
    try {
      const buf = await readFile(path);
      await uploadEncrypted(buf, file);
      await rm(path);
      console.log(`flushed queued file ${file}`);
    } catch (err) {
      console.error(`still can't upload ${file}, leaving queued:`, err.message);
      // Stop flushing on the first failure — likely means HUB_URL is
      // still unreachable, no point burning through the rest.
      break;
    }
  }
}

async function main() {
  requireEnv();
  await flushQueue();

  const state = await loadState();
  let xml;
  try {
    xml = await pullFromTally(state.lastAlterId);
  } catch (err) {
    console.error("Tally unreachable this run:", err.message);
    process.exit(1); // systemd timer retries on the next schedule
  }

  const encrypted = encrypt(xml, TALLY_ETL_ENCRYPTION_KEY);
  const filename = `tally-${new Date().toISOString().replace(/[:.]/g, "-")}.xml.enc`;

  try {
    const result = await uploadEncrypted(encrypted, filename);
    console.log("uploaded:", result.path);
    // Real ALTERID extraction needs a parsed response from a live Tally
    // instance — see the README's validation step.
    state.lastAlterId = state.lastAlterId; // placeholder until validated
    await saveState(state);
  } catch (err) {
    console.error("hub unreachable, queueing locally:", err.message);
    await mkdir(QUEUE_DIR, { recursive: true });
    await writeFile(join(QUEUE_DIR, filename), encrypted);
  }
}

main();
