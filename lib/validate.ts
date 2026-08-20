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
