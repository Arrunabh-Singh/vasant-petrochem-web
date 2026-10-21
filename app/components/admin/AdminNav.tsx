"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The dashboard's section nav.
 *
 * Replaces a flat row of twelve links in a non-wrapping flex container. That
 * row overflowed its own header at 1440px — "Security" was clipped, "TDS
 * Requests" wrapped mid-label, and the email and sign-out button were pushed
 * off-screen entirely, so at no viewport could you actually sign out. On a
 * phone only three and a half links were reachable; the remaining eight
 * sections had no route to them at all.
 *
 * Two changes fix that. Sign-out moves out of the scrolling area entirely
 * (see layout.tsx) so it is always reachable, and the links themselves become
 * a horizontally scrollable rail — the same idiom `.bleed-rail` already uses
 * for the phone product carousel on the public site.
 *
 * The groups are the reason the rail stays legible at twelve items: they turn
 * one undifferentiated list into four labelled runs that match how the
 * business actually thinks about the work, so scanning for "Tally" means
 * looking in Accounts rather than reading every label.
 */

const GROUPS: { label: string; links: { name: string; href: string }[] }[] = [
  {
    label: "Sales",
    links: [
      { name: "Leads", href: "/admin" },
      { name: "Products", href: "/admin/products" },
      { name: "TDS Requests", href: "/admin/tds-requests" },
      { name: "Offers", href: "/admin/market/offers" },
    ],
  },
  {
    label: "Logistics",
    links: [
      { name: "Shipments", href: "/admin/logistics/shipments" },
      { name: "Vehicles", href: "/admin/logistics/vehicles" },
      { name: "Sanctions", href: "/admin/logistics/sanctions" },
    ],
  },
  {
    label: "Accounts",
    links: [
      { name: "Benchmarks", href: "/admin/market/benchmarks" },
      { name: "Tally", href: "/admin/accounts/tally" },
    ],
  },
  {
    label: "Governance",
    links: [
      { name: "Documents", href: "/admin/documents" },
      { name: "Compliance", href: "/admin/compliance" },
      { name: "Approvals", href: "/admin/approvals" },
      { name: "Security", href: "/admin/security" },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  // "/admin" is Leads, so it only matches exactly — every other section is a
  // prefix match so detail routes (/admin/products/[id]) keep their parent lit.
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav aria-label="Dashboard sections" className="border-t border-white/10">
      {/* Scrolls on narrow screens; wraps to a second line from xl up, where
          there is room to show every section at once rather than hiding the
          last group behind a scroll gesture nobody is prompted to make. */}
      <div className="flex gap-x-7 gap-y-2 overflow-x-auto xl:flex-wrap xl:overflow-x-visible px-[22px] py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GROUPS.map((group) => (
          // role=group + aria-label carries the grouping to screen readers,
          // which would otherwise get one flat run of twelve links; the
          // visible label is then decorative and hidden from them.
          <div
            key={group.label}
            role="group"
            aria-label={group.label}
            className="flex items-center gap-4 shrink-0"
          >
            <span
              aria-hidden
              className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35 select-none"
            >
              {group.label}
            </span>
            {group.links.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap text-xs font-bold uppercase tracking-widest transition-colors border-b-2 pb-0.5 ${
                    active
                      ? "text-brand-accent border-brand-accent"
                      : "text-slate-300 border-transparent hover:text-brand-accent"
                  }`}
                >
                  {l.name}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
