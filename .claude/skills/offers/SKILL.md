---
name: offers
description: Propose a lot for the live offers board on Vasant Petrochem's public site, or read what is on it. Use when asked to put stock, a cargo or a lot up for sale on the website. Offers are proposed only; a different person publishes them.
---

# Live offers

The board at `/marketplace/offers` shows lots the sales desk has approved. Offers live in the database (`market.offer`), not in git.

## Who does what

- **Propose:** the MCP tool `propose_offer` (for agents) or the hub's Sales › Offers page (for staff). A proposal is `pending` and is not public.
- **Publish:** a person in the hub, who must be someone other than the proposer. For an agent's proposal, that means someone other than the person whose MCP token the agent used. The database enforces this (`offer_review`), so do not try to work around it.
- **Read:** the MCP tool `list_offers`.

## Proposing

Collect from the person asking:
- `product_slug`: a catalogue slug, as in `content/products/`;
- `title`: what buyers will see, for example "20 MT Base Oil SN500 in drums";
- `quantity` and `uom` (MT, kL, L, kg, drums or pails);
- `location` (where it is) and `basis` (for example "Ex-works");
- `valid_until`: the last day it is offered, today or later;
- `notes` (optional, and public).

Never add a price; the board never shows one. Never guess a quantity, location or date: ask. Then call `propose_offer`, and tell the person who asked that someone else has to publish it in the hub.
