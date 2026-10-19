/**
 * VP-LEG-002 / MNC P4: company identity is defined once, in
 * content/company.json, which both this hub and the public site (site/)
 * read. Everything here (app/content.ts, JSON-LD, footer, emails) derives
 * from this object.
 *
 * MNC P5: real-world values the owner has not supplied are `null`, with a
 * TODO(VP-HUM-xxx) marker in the file's `_todo` block. Never fill them with
 * plausible-looking data, and render nothing while they are null (a
 * placeholder must not reach a production render, MNC §11.3).
 */
import data from "../content/company.json" with { type: "json" };

/** "2025" in the founding year, "2025–2026" after. VP-LEG-006. */
export function copyrightYears(founded: number, now: number = new Date().getFullYear()): string {
  return now > founded ? `${founded}–${now}` : `${founded}`;
}

export type Company = {
  tradeName: string;
  foundedYear: number;
  legalName: string | null;
  registeredOffice: string | null;
  gstin: string | null;
  udyam: string | null;
  cin: string | null;
  iec: string | null;
  /** Export features stay hidden until an IEC exists (MNC VP-CORP-008). */
  exports: boolean;
  /** Works / facility address (the Mangaliya site the pages already describe). */
  works: {
    street: string;
    city: string;
    region: string;
    regionCode: string;
    postalCode: string;
    country: string;
    lat: number;
    lng: number;
  };
  /** wa.me format for `whatsapp`: digits only. */
  phone: { display: string; href: string; whatsapp: string };
  email: string;
  mailboxes: { sales: string | null; documents: string | null; careers: string | null; security: string | null };
  hours: {
    label: string;
    days: string;
    time: string;
    /** schema.org OpeningHoursSpecification */
    opens: string;
    closes: string;
    dayOfWeek: string[];
  };
  social: { linkedin: string | null; indiamart: string | null; justdial: string | null; googleBusiness: string | null };
};

const { $schema: _schema, _todo: _pending, ...facts } = data;

export const company: Readonly<Company> = Object.freeze(facts satisfies Company);
