export function formatKWD(value: number): string {
  return `${value.toFixed(3)} KWD`;
}
/** bundle_price is the price of one whole bundle, not per pack. */
export function lineTotal(bundlePrice: number, bundleQty: number): number {
  return Math.round(bundlePrice * bundleQty * 1000) / 1000;
}
export function packCount(unitsPerBundle: number, bundleQty: number): number {
  return unitsPerBundle * bundleQty;
}
