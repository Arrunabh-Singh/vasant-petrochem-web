-- The Tally office box encrypts delta XML client-side before it ever
-- leaves the office LAN (§5.7: "the Tally machine and office LAN never
-- see a [document] key" -- this is the analogous key for the raw ETL
-- staging leg). AES-256-GCM, symmetric, decrypted by supabase/functions/
-- parse-tally on the way in. The office box needs the SAME key value —
-- it cannot call vault_key_for() itself (no Supabase session) — so the
-- owner copies this generated value out to the box once during setup
-- (docs/OWNER_CHECKLIST.md; see tools/office-box/README.md).
select vault.create_secret(encode(gen_random_bytes(32), 'base64'), 'doc-key:tally-etl', 'AES-256-GCM key shared with the office box for raw Tally XML staging')
where not exists (select 1 from vault.secrets where name = 'doc-key:tally-etl');
