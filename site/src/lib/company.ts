/**
 * Company facts, read from content/company.json (the single source the hub
 * also reads) and validated at build time. MNC P5: a null value renders
 * nothing; its TODO marker lives in the file's `_todo` block.
 */
import data from "../../../content/company.json" with { type: "json" };
import { companySchema } from "../content/schema.ts";

const { _todo: _pending, $schema: _schema, ...facts } = companySchema.parse(data);

export const company = Object.freeze(facts);

export const SITE_URL = "https://www.vasantpetrochem.com";

/** "2025" in the founding year, "2025–2026" after (VP-LEG-006). */
export function copyrightYears(founded: number = company.foundedYear, now: number = new Date().getFullYear()): string {
  return now > founded ? `${founded}–${now}` : `${founded}`;
}

/** One-line works address: street, city, state code and PIN code. */
export const addressLine = `${company.works.street}, ${company.works.city}, ${company.works.regionCode} ${company.works.postalCode}`;

/** A wa.me link to the sales desk with a prefilled message. */
export function whatsappHref(message: string): string {
  return `https://wa.me/${company.phone.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** The address buyers should write to: the domain sales@ once it exists (VP-HUM-002). */
export const salesEmail = company.mailboxes.sales ?? company.email;
