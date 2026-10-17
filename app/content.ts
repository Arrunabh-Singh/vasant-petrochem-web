/**
 * Single source of truth for facts that appear in more than one place.
 *
 * The product catalog lives in Supabase (see lib/products.ts) so it can be
 * edited from /admin without a deploy. This file covers everything else
 * duplicated across components. Company identity and contact facts are
 * defined once in lib/company.ts; `site`/`contact` here are views of it.
 */

import { company } from "../lib/company.ts";

export const site = {
  url: "https://vasantpetrochem.com",
  name: company.tradeName,
  legalName: company.legalName ?? company.tradeName,
  tagline: "Manufacturing and trading industrial oils, fuels & lubricants across Central India.",
  foundedYear: company.foundedYear,
} as const;

/** View of `company` in the shape the page components already consume. */
export const contact = {
  phone: company.phone.display,
  phoneHref: company.phone.href,
  whatsapp: company.phone.whatsapp,
  email: company.email,
  address: company.works,
  hours: company.hours.label,
} as const;

/** One-line works address, e.g. for the footer and the mobile menu. */
export const addressLine = `${contact.address.street}, ${contact.address.city}, MP ${contact.address.postalCode}`;

export const nav = [
  { name: "Home", href: "/" },
  { name: "Products", href: "/products" },
  { name: "Industries", href: "/industries" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
] as const;
