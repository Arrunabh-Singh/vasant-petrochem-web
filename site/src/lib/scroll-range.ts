/**
 * The arithmetic of CSS view-progress ranges (CSS Scroll-driven Animations,
 * "view progress timelines"), for islands/scrub.ts: parse an animation-range
 * such as "contain calc(22% + 0 * 72% / 8) contain 23%", and find the scroll
 * offsets a named range runs between. Pure functions, unit-tested.
 */
export type Point = { name: string; pct: number };

/** Splits a list at commas outside brackets. */
export function splitTop(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Evaluates calc() arithmetic over percentages and numbers, e.g. "calc(22% + (0 + 1) * 72% / 8)" → 31. */
export function evaluate(expr: string): number {
  const src = expr.replace(/calc\(/g, "(").replace(/%/g, "");
  let i = 0;
  const peek = () => src[i];
  const skip = () => {
    while (src[i] === " ") i++;
  };
  const number = (): number => {
    skip();
    if (peek() === "(") {
      i++;
      const v = sum();
      skip();
      i++; // ")"
      return v;
    }
    if (peek() === "-") {
      i++;
      return -number();
    }
    const m = /^[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/i.exec(src.slice(i));
    if (!m) throw new Error(`bad range value: ${expr}`);
    i += m[0].length;
    return Number(m[0]);
  };
  const product = (): number => {
    let v = number();
    for (;;) {
      skip();
      if (peek() === "*") (i++, (v *= number()));
      else if (peek() === "/") (i++, (v /= number()));
      else return v;
    }
  };
  const sum = (): number => {
    let v = product();
    for (;;) {
      skip();
      if (peek() === "+") (i++, (v += product()));
      else if (peek() === "-") (i++, (v -= product()));
      else return v;
    }
  };
  return sum();
}

const NAMES = /^(entry-crossing|exit-crossing|cover|contain|entry|exit)\s+/;

/** One animation's range, e.g. "contain calc(...) contain 23%" → two points. */
export function parseRange(text: string): [Point, Point] | null {
  const points: Point[] = [];
  let rest = text.trim();
  while (rest) {
    const m = NAMES.exec(rest);
    if (!m) return null;
    rest = rest.slice(m[0].length);
    let value: string;
    if (rest.startsWith("calc(")) {
      let depth = 0;
      let j = 0;
      for (; j < rest.length; j++) {
        if (rest[j] === "(") depth++;
        if (rest[j] === ")" && --depth === 0) break;
      }
      value = rest.slice(0, j + 1);
    } else value = rest.split(/\s+/)[0] ?? "";
    rest = rest.slice(value.length).trim();
    points.push({ name: m[1]!, pct: evaluate(value) });
  }
  const [from, to] = points;
  if (!from) return null;
  return [from, to ?? { name: from.name, pct: 100 }];
}

/** The scroll offsets a named range runs between, for a subject at `top` with height `h` in a scrollport of height `H`. */
export function rangeOffsets(name: string, top: number, h: number, H: number): [number, number] {
  const coverFrom = top - H;
  const coverTo = top + h;
  const containFrom = h <= H ? top + h - H : top;
  const containTo = h <= H ? top : top + h - H;
  switch (name) {
    case "contain":
      return [containFrom, containTo];
    case "entry":
      return [coverFrom, containFrom];
    case "exit":
      return [containTo, coverTo];
    case "entry-crossing":
      return [coverFrom, top + h - H];
    case "exit-crossing":
      return [top, coverTo];
    default:
      return [coverFrom, coverTo];
  }
}

