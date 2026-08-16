/**
 * Single source of truth for facts that appear in more than one place.
 *
 * The product catalog lives in Supabase (see lib/products.ts) so it can be
 * edited from /admin without a deploy. This file covers everything else
 * duplicated across components: contact details, nav, JSON-LD identity.
 */

export const site = {
  url: "https://vasantpetrochem.com",
  name: "Vasant Petrochem",
  legalName: "Vasant Petrochem",
  tagline: "Manufacturing and trading industrial oils, fuels & lubricants across Central India.",
  foundedYear: 2025,
} as const;

export const contact = {
  phone: "+91 94250 58496",
  phoneHref: "tel:+919425058496",
  whatsapp: "919425058496",
  email: "vasantpetrochem@gmail.com",
  address: {
    street: "Industrial Area, Mangaliya",
    city: "Indore",
    region: "Madhya Pradesh",
    postalCode: "453771",
    country: "IN",
    lat: 22.6569,
    lng: 75.7898,
  },
  hours: "Mon — Sat: 9:00 AM — 6:00 PM IST",
} as const;

/** "Industrial Area, Mangaliya, Indore, MP 453771" */
export const addressLine = `${contact.address.street}, ${contact.address.city}, MP ${contact.address.postalCode}`;

export const nav = [
  { name: "Home", href: "/" },
  { name: "Products", href: "/products" },
  { name: "Industries", href: "/industries" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
] as const;
