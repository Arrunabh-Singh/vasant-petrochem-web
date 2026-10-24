-- The site token, checked by its SHA-256. The Worker holds the token; Vault
-- holds only its hash, as 'site-token-sha256:public-site'. scripts/cutover.mjs
-- creates the token, sets it on the Worker and prints the hash, so the token
-- itself never passes through a terminal, a chat or a file. The plaintext
-- secret from 20261021120000_site_r1.sql ('site-token:public-site') is no
-- longer read.
--
-- Until the hash is stored, every call is refused: the comparison is wrapped
-- in coalesce, because the callers' `if not site_token_ok(...)` would treat a
-- null (no hash yet) as a pass.
set lock_timeout = '10s';

create or replace function public.site_token_ok(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    coalesce(p_token, '') <> ''
      and encode(extensions.digest(p_token, 'sha256'), 'hex')
        = (select decrypted_secret from vault.decrypted_secrets where name = 'site-token-sha256:public-site' limit 1),
    false)
$$;

revoke all on function public.site_token_ok(text) from public, anon, authenticated;
