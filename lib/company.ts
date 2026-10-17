/**
 * VP-LEG-002 / MNC P4: the one place company identity lives. Everything else
 * (app/content.ts, JSON-LD, footer, emails) derives from this object.
 *
 * MNC P5: real-world values the owner has not supplied are `null` with a
 * TODO(VP-HUM-xxx) marker. Never fill them with plausible-looking data, and
 * render nothing while they are null (a placeholder must not reach a
 * production render, MNC §11.3).
 */
export const company = Object.freeze({
  tradeName: "Vasant Petrochem",
  foundedYear: 2025,

  // TODO(VP-HUM-001): registered legal entity name (as on the GST certificate)
  legalName: null as string | null,
  // TODO(VP-HUM-001): registered office address — distinct from the works address below
  registeredOffice: null as string | null,
  // TODO(VP-HUM-001): GSTIN
  gstin: null as string | null,
  // TODO(VP-HUM-001): Udyam registration number
  udyam: null as string | null,
  // TODO(VP-HUM-001): CIN, only if the entity is incorporated
  cin: null as string | null,

  /** Works / facility address (the Mangaliya site the pages already describe). */
  works: Object.freeze({
    street: "Industrial Area, Mangaliya",
    city: "Indore",
    region: "Madhya Pradesh",
    postalCode: "453771",
    country: "IN",
    lat: 22.6569,
    lng: 75.7898,
  }),

  phone: Object.freeze({
    display: "+91 94250 58496",
    href: "tel:+919425058496",
    /** wa.me format: digits only. */
    whatsapp: "919425058496",
  }),

  // TODO(VP-HUM-002): replace with sales@ on the company domain once it exists,
  // then retire the Gmail address from every public surface.
  email: "vasantpetrochem@gmail.com",

  hours: Object.freeze({
    label: "Mon — Sat: 9:00 AM — 6:00 PM IST",
    days: "Mon — Sat",
    time: "9:00 AM — 6:00 PM",
    /** schema.org OpeningHoursSpecification */
    opens: "09:00",
    closes: "18:00",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  }),

  // TODO(VP-HUM-012): LinkedIn / IndiaMART / Justdial / Google Business URLs
  social: Object.freeze({
    linkedin: null as string | null,
    indiamart: null as string | null,
    justdial: null as string | null,
    googleBusiness: null as string | null,
  }),
});
