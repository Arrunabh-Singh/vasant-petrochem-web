-- Correction: device_credential (a hash of a device secret) can verify
-- possession of a shared secret, but cannot verify an HMAC signature --
-- HMAC needs the raw key, not a hash of it. Rather than storing raw
-- per-device secrets in Postgres, devices authenticate the same way the
-- office box does (lib/upload-ticket.ts): a signed, opaque bearer ticket
-- minted by an admin session, verified against a server-side secret that
-- never touches the database at all. Simpler and one fewer secret store.
drop table if exists iot.device_credential;
