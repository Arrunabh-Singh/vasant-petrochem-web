-- document-storage-hardening.md §2.4: envelope encryption for the five
-- "crown jewel" classes. Keys live in Supabase Vault — never in Vercel
-- env vars, never in the Tally ETL, never held statically by the app;
-- lib/vault-key.ts fetches one on demand per request via this RPC.

select vault.create_secret(encode(gen_random_bytes(32), 'base64'), 'doc-key:purchase-bills', 'AES-256-GCM data key for purchase-bills class')
where not exists (select 1 from vault.secrets where name = 'doc-key:purchase-bills');

select vault.create_secret(encode(gen_random_bytes(32), 'base64'), 'doc-key:sales-bills', 'AES-256-GCM data key for sales-bills class')
where not exists (select 1 from vault.secrets where name = 'doc-key:sales-bills');

select vault.create_secret(encode(gen_random_bytes(32), 'base64'), 'doc-key:gst', 'AES-256-GCM data key for gst class')
where not exists (select 1 from vault.secrets where name = 'doc-key:gst');

select vault.create_secret(encode(gen_random_bytes(32), 'base64'), 'doc-key:hr', 'AES-256-GCM data key for hr class')
where not exists (select 1 from vault.secrets where name = 'doc-key:hr');

select vault.create_secret(encode(gen_random_bytes(32), 'base64'), 'doc-key:bank', 'AES-256-GCM data key for bank class')
where not exists (select 1 from vault.secrets where name = 'doc-key:bank');

create or replace function public.vault_key_for(p_class text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret::text from vault.decrypted_secrets
  where name = 'doc-key:' || p_class
$$;

revoke all on function public.vault_key_for(text) from public;
grant execute on function public.vault_key_for(text) to service_role;
