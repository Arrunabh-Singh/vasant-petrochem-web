import { z } from "zod";

export type ProductSpec = { label: string; value: string };

function isSpec(value: unknown): value is ProductSpec {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).label === "string" &&
    typeof (value as Record<string, unknown>).value === "string"
  );
}

/**
 * audit.md M20: admin pastes raw JSON into the specs textarea
 * (app/components/admin/ProductEditForm.tsx) and only Array.isArray is
 * checked before it's stored. A malformed row (`[{}]`, a NULL, a
 * non-array) used to throw deep inside rendering (product page, cards,
 * grid flatMap) and take down the entire public catalog on one bad row.
 * Coerce instead of trust: drop entries that don't match the shape.
 */
export function coerceSpecs(value: unknown): ProductSpec[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isSpec);
}

export function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

// ---------------------------------------------------------------------------
// VP-SEC-005: server-side validation for the public forms. Client-side
// `required`/`type=email` attributes are UX only — a scripted POST skips them.
// ---------------------------------------------------------------------------
// C0 control characters except tab/newline/carriage-return, plus DEL.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
// An opening/closing tag, comment or declaration. Bare "<" / ">" stay legal
// because buyers write specs like "< 1.8 % wt".
const HTML = /<\/?[a-z!?]/i;

const clean = (v: unknown) => (typeof v === "string" ? v.replace(CONTROL, "") : v);
const bad = (label: string) => ({ error: `${label} is not valid.` });

/** Free text: control characters stripped, trimmed, length-capped, no HTML. */
const text = (label: string, max: number) =>
  z.preprocess(
    clean,
    z
      .string(bad(label))
      .trim()
      .max(max, `${label} is too long (max ${max} characters).`)
      .refine((v) => !HTML.test(v), `${label} cannot contain HTML.`),
  );

export const emailField = z.preprocess(
  clean,
  z
    .string(bad("Email"))
    .trim()
    .min(1, "Name and email are required.")
    .max(320, "Email is too long.")
    .pipe(z.email("Enter a valid email address.")),
);

// Digits with the separators people actually type: "+91 98765 43210", "(0731) 2444-0000".
const PHONE = /^[+(]?[0-9][0-9 ()-]{4,24}$/;

// Lengths mirror the CHECK constraints in 20260816120003_constraints_indexes.sql
// and 20260820120001_quote_requests_phone.sql.
export const quoteFormSchema = z.object({
  name: text("Name", 200).pipe(z.string().min(1, "Name and email are required.")),
  email: emailField,
  company: text("Company name", 200),
  phone: text("Phone", 40).refine((v) => v === "" || PHONE.test(v), "Enter a valid phone number."),
  product: text("Product", 200),
  quantity: text("Quantity", 100),
  message: text("Details", 5000),
});

export type QuoteForm = z.infer<typeof quoteFormSchema>;

export const QUOTE_FIELDS = ["name", "email", "company", "phone", "product", "quantity", "message"] as const;

/** Validates raw form values; returns the first problem as a user-facing message. */
export function parseQuoteForm(
  raw: Record<string, unknown>,
): { ok: true; data: QuoteForm } | { ok: false; message: string } {
  const result = quoteFormSchema.safeParse(raw);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, message: result.error.issues[0]?.message ?? "Check the form and try again." };
}

export function parseEmail(raw: unknown): { ok: true; email: string } | { ok: false; message: string } {
  const result = emailField.safeParse(raw);
  return result.success
    ? { ok: true, email: result.data }
    : { ok: false, message: result.error.issues[0]?.message ?? "Enter a valid email address." };
}
