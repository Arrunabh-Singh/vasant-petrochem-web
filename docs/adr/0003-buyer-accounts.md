# ADR-0003: Buyer accounts (amends MNC P6)

- Status: accepted (owner, 2026-10-19); built in Release 2
- Amends: MNC.md P6 ("do not build … a user account layer")

## Context

MNC P6 treated every custom sign-in surface as a liability the company was not staffed to defend.

The owner has since decided the site is the company's main channel for international dealings, and chose buyer accounts with tracking for the marketplace. Peers that offer this (ChemPoint's My ChemPoint, Chemtradeasia's sign-in) show buyers expect quote, order and document history in one place.

## Decision

Buyer accounts are built in Release 2, under these conditions:

- **Separate origin.** The hub moves to `hub.vasantpetrochem.com` first, so staff and buyer sessions never share a cookie origin.
- **Authentication.** Supabase Auth with email one-time codes, and passkeys once Supabase marks them generally available. TOTP MFA is required for organisation admins and finance users.
  - Sessions are httpOnly, SameSite cookies: 12 hours idle, 7 days absolute.
  - Accepting a quotation or inviting a member requires signing in again.
- **Least privilege.** The public Worker never holds the service-role key. Row-level security scopes every buyer row to the buyer's own organisation, and state changes go through audited RPCs.
- **Onboarding.**
  - An organisation stays pending until staff review its KYC documents.
  - It needs a `clear` sanctions screening (`logistics.counterparty_sanction`) from the last 12 months; the database enforces this.
- **Anti-fraud.** The portal never shows or edits bank details. Payment instructions appear only on proformas issued from the hub, with a "confirm by phone" notice.
- **Assurance.** Before launch: an OWASP ASVS Level 2 self-assessment, row-level security tests, and DPDP and GDPR data export and deletion requests.

## Consequences

MNC.md P6 carries a dated note pointing here. The hub gains sales-desk screens: account review, quotation builder, orders, shipment linking and document sharing.
