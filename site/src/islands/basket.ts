/**
 * The quote list: products a buyer is gathering into one enquiry. Kept in
 * localStorage on the buyer's own device (no account, nothing on our servers
 * until they send it) and shareable as a link. Every read is validated: the
 * stored value and a shared link are both untrusted input.
 */
export const UNITS = ["MT", "kL", "L", "kg", "drums", "pails"] as const;
export type Unit = (typeof UNITS)[number];
export type Line = { slug: string; qty: string; unit: Unit; pack: string; notes: string };

export const MAX_LINES = 20;
const KEY = "vp-basket";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const QTY = /^(?:\d{1,7}(?:\.\d{1,3})?)?$/;

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f<>]/g, "").slice(0, max) : "");

export function validLine(x: unknown): Line | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.slug !== "string" || !SLUG.test(o.slug) || o.slug.length > 80) return null;
  const qty = typeof o.qty === "string" && QTY.test(o.qty) ? o.qty : "";
  const unit = UNITS.includes(o.unit as Unit) ? (o.unit as Unit) : "MT";
  return { slug: o.slug, qty, unit, pack: clean(o.pack, 60), notes: clean(o.notes, 200) };
}

export function parseLines(x: unknown): Line[] {
  if (!Array.isArray(x)) return [];
  const seen = new Set<string>();
  const out: Line[] = [];
  for (const item of x) {
    const line = validLine(item);
    if (line && !seen.has(line.slug)) {
      seen.add(line.slug);
      out.push(line);
    }
    if (out.length === MAX_LINES) break;
  }
  return out;
}

type Store = Pick<Storage, "getItem" | "setItem">;
const storage = (): Store | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // blocked storage (private mode, policies): the list just isn't remembered
  }
};

export function readBasket(store: Store | null = storage()): Line[] {
  try {
    const v = JSON.parse(store?.getItem(KEY) ?? "null");
    return v && v.v === 1 ? parseLines(v.lines) : [];
  } catch {
    return [];
  }
}

export function writeBasket(lines: Line[], store: Store | null = storage()): void {
  try {
    store?.setItem(KEY, JSON.stringify({ v: 1, lines: parseLines(lines) }));
  } catch {
    /* quota or blocked: nothing to do */
  }
  globalThis.dispatchEvent?.(new CustomEvent("vp:basket"));
}

export function addLine(slug: string, store: Store | null = storage()): Line[] {
  const lines = readBasket(store);
  if (!lines.some((l) => l.slug === slug) && lines.length < MAX_LINES) {
    lines.push({ slug, qty: "", unit: "MT", pack: "", notes: "" });
  }
  writeBasket(lines, store);
  return lines;
}

export function removeLine(slug: string, store: Store | null = storage()): Line[] {
  const lines = readBasket(store).filter((l) => l.slug !== slug);
  writeBasket(lines, store);
  return lines;
}

const toB64Url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64Url = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

/** The `list` URL parameter that shares a quote list. */
export const encodeLines = (lines: Line[]) => toB64Url(JSON.stringify(lines.map(({ slug, qty, unit, pack }) => ({ slug, qty, unit, pack }))));

export function decodeLines(param: string | null): Line[] {
  if (!param || param.length > 4000) return [];
  try {
    return parseLines(JSON.parse(fromB64Url(param)));
  } catch {
    return [];
  }
}
