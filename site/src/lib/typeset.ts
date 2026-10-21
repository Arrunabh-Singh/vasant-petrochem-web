/**
 * Typesetting for catalogue values: an en dash in ranges (9,800–10,200), a true
 * minus sign (−6), and a no-break space after a comparison sign (≈ 10,300), so
 * a value never splits badly across lines.
 */
export const typeset = (value: string) =>
  value
    .replace(/(\d)\s*-\s*(?=\d)/g, "$1–")
    .replace(/(^|[\s(])-(?=\d)/g, "$1−")
    .replace(/([≈<>≤≥]) /g, "$1 ");

/** A number and its unit stay on one line: "20 kL". */
export const withUnit = (value: string, unit?: string | null) => (unit ? `${value} ${unit}` : value);
