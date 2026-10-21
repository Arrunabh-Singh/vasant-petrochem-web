/**
 * Free-text rules shared by every public form (VP-SEC-005, ported from the
 * hub's lib/validate.ts): control characters stripped, trimmed, length
 * capped, and no HTML tags. Bare "<" and ">" stay legal: buyers write
 * "< 1.8 % wt".
 */
import { z } from "astro/zod";

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML = /<\/?[a-z!?]/i;

export const clean = (v: unknown) => (typeof v === "string" ? v.replace(CONTROL, "") : v);

/** Optional free text; an absent field becomes "". */
export const text = (label: string, max: number) =>
  z.preprocess(
    (v) => (v === undefined || v === null ? "" : clean(v)),
    z
      .string({ error: `${label} is not valid.` })
      .trim()
      .max(max, `${label} is too long (${max} characters at most).`)
      .refine((v) => !HTML.test(v), `${label} cannot contain HTML.`),
  );

export const requiredText = (label: string, max: number, message: string) =>
  text(label, max).pipe(z.string().min(1, message));

export const email = z.preprocess(
  clean,
  z
    .string({ error: "Enter your email so we can reply." })
    .trim()
    .min(1, "Enter your email so we can reply.")
    .max(254, "That email address is too long.")
    .pipe(z.email("Enter a valid email address, like name@company.com.")),
);

// Digits with the separators people type: "+91 98765 43210", "(0731) 2444-0000".
const PHONE = /^[+(]?[0-9][0-9 ()-]{4,24}$/;
export const phone = text("Phone", 24).refine((v) => v === "" || PHONE.test(v), "Enter a phone number with digits, like +91 98765 43210.");
