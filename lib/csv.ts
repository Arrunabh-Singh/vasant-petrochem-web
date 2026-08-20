// audit.md M9: a lead value starting with = + - @ executes as a formula
// when the admin opens the export in Excel/Sheets. Prefix those with a
// leading apostrophe so the cell is always read as text.
export function toCsvValue(value: string): string {
  const escaped = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${escaped.replace(/"/g, '""')}"`;
}
