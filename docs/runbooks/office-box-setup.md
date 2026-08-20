# Office Box Setup

The full setup runbook lives next to the code it documents:
**[`tools/office-box/README.md`](../../tools/office-box/README.md)**.

Short version: it's the always-on machine (repurposed PC or Raspberry
Pi, ₹0–7k) that runs the Tally delta pull, the encrypted DB backup, and
a Supabase keepalive ping — on its own schedule, with nobody at the
keyboard. It replaces "mom's laptop runs a task at 11pm," which the
infra review flagged as the #1 risk in the original sync design (laptop
sleep, Windows Update reboots, someone using Tally mid-copy all silently
break it).

See `docs/OWNER_CHECKLIST.md` items 6–9 and 16–17 for what to do before
and after setup.
