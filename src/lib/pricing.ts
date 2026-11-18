export function formatKWD(value: number): string {
  return `${value.toFixed(3)} KWD`;
}
/** Normalize untrusted input without coercing objects, booleans, or empty strings. */
export function clampBundleQty(value: unknown, max = 99): number {
  const limit = Number.isFinite(max) ? Math.max(1, Math.floor(max)) : 99;
  if (typeof value !== "number" && typeof value !== "string") return 1;
  if (typeof value === "string" && !value.trim()) return 1;
  const qty = Number(value);
  return Number.isFinite(qty) ? Math.min(limit, Math.max(1, Math.floor(qty))) : 1;
}

export function cartTotal(lines: readonly { bundlePrice: number; bundleQty: number }[]): number {
  return lines.reduce((fils, line) => fils + Math.round(line.bundlePrice * line.bundleQty * 1000), 0) / 1000;
}
/** bundle_price is the price of one whole bundle, not per pack. */
export function lineTotal(bundlePrice: number, bundleQty: number): number {
  return Math.round(bundlePrice * bundleQty * 1000) / 1000;
}
export function packCount(unitsPerBundle: number, bundleQty: number): number {
  return unitsPerBundle * bundleQty;
}
