import { supabase } from "@/integrations/supabase/client";
import type { CartLine } from "./cart";
import { clampBundleQty, formatKWD } from "./pricing";

export type CurrentTier = {
  tierId: string;
  productId: string;
  productName: string;
  imageUrl: string;
  unitsPerBundle: number;
  bundlePrice: number;
};

export type CartChange =
  | { type: "removed"; tierId: string; productName: string; unitsPerBundle: number }
  | {
      type: "updated";
      tierId: string;
      productName: string;
      oldUnits: number;
      newUnits: number;
      oldPrice: number;
      newPrice: number;
    };

export function reconcileCart(
  lines: CartLine[],
  current: CurrentTier[],
): { lines: CartLine[]; changes: CartChange[] } {
  if (lines.length === 0) {
    return { lines, changes: [] };
  }

  const currentMap = new Map<string, CurrentTier>();
  for (const tier of current) {
    currentMap.set(tier.tierId, tier);
  }

  const newLines: CartLine[] = [];
  const changes: CartChange[] = [];
  let hasDifferences = false;

  for (const line of lines) {
    const cur = currentMap.get(line.tierId);
    if (!cur) {
      changes.push({
        type: "removed",
        tierId: line.tierId,
        productName: line.productName,
        unitsPerBundle: line.unitsPerBundle,
      });
      hasDifferences = true;
      continue;
    }

    const clampedQty = clampBundleQty(line.bundleQty);
    const unitsChanged = line.unitsPerBundle !== cur.unitsPerBundle;
    const priceChanged = line.bundlePrice !== cur.bundlePrice;
    const nameChanged = line.productName !== cur.productName;
    const imageChanged = line.imageUrl !== cur.imageUrl;
    const prodIdChanged = line.productId !== cur.productId;
    const qtyChanged = line.bundleQty !== clampedQty;

    if (unitsChanged || priceChanged) {
      changes.push({
        type: "updated",
        tierId: line.tierId,
        productName: cur.productName,
        oldUnits: line.unitsPerBundle,
        newUnits: cur.unitsPerBundle,
        oldPrice: line.bundlePrice,
        newPrice: cur.bundlePrice,
      });
    }

    if (unitsChanged || priceChanged || nameChanged || imageChanged || prodIdChanged || qtyChanged) {
      hasDifferences = true;
    }

    newLines.push({
      productId: cur.productId,
      productName: cur.productName,
      imageUrl: cur.imageUrl,
      tierId: cur.tierId,
      unitsPerBundle: cur.unitsPerBundle,
      bundlePrice: cur.bundlePrice,
      bundleQty: clampedQty,
    });
  }

  if (!hasDifferences && newLines.length === lines.length) {
    return { lines, changes: [] };
  }

  return { lines: newLines, changes };
}

export function describeChange(change: CartChange): string {
  if (change.type === "removed") {
    return `${change.productName} (${change.unitsPerBundle}-pack) is no longer available and was removed from your cart.`;
  }
  if (change.oldUnits === change.newUnits) {
    return `${change.productName} (${change.newUnits}-pack): price changed from ${formatKWD(change.oldPrice)} to ${formatKWD(change.newPrice)}.`;
  }
  return `${change.productName}: bundle size changed from ${change.oldUnits}-pack to ${change.newUnits}-pack (price ${formatKWD(change.oldPrice)} → ${formatKWD(change.newPrice)}).`;
}

export async function fetchCurrentTiers(tierIds: string[]): Promise<CurrentTier[]> {
  if (tierIds.length === 0) return [];

  const { data, error } = await supabase
    .from("pricing_tiers")
    .select("id, units_per_bundle, bundle_price, product:products(id, name, image_url)")
    .in("id", tierIds);

  if (error) throw error;
  if (!data) return [];

  const result: CurrentTier[] = [];
  for (const row of data as any[]) {
    const rawProd = Array.isArray(row.product) ? row.product[0] : row.product;
    if (!rawProd || typeof rawProd !== "object") continue;

    result.push({
      tierId: String(row.id),
      productId: String(rawProd.id),
      productName: String(rawProd.name ?? ""),
      imageUrl: String(rawProd.image_url ?? ""),
      unitsPerBundle: Number(row.units_per_bundle),
      bundlePrice: Number(row.bundle_price),
    });
  }

  return result;
}

