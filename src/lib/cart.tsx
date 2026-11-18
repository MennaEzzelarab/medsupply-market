import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clampBundleQty } from "./pricing";

export type CartLine = {
  productId: string; productName: string; imageUrl: string;
  tierId: string; unitsPerBundle: number; bundlePrice: number; bundleQty: number;
};

export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const i = lines.findIndex((l) => l.tierId === line.tierId);
  if (i === -1) return [...lines, { ...line, bundleQty: clampBundleQty(line.bundleQty) }];
  return lines.map((l, j) => (j === i ? { ...l, bundleQty: clampBundleQty(l.bundleQty + clampBundleQty(line.bundleQty)) } : l));
}

export function restoreCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<CartLine[]>((lines, item: unknown) => {
    if (!item || typeof item !== "object") return lines;
    const l = item as { [K in keyof CartLine]?: unknown };
    if (![l.productId, l.productName, l.tierId].every((v) => typeof v === "string" && v.trim().length > 0)
      || typeof l.imageUrl !== "string"
      || typeof l.unitsPerBundle !== "number" || !Number.isInteger(l.unitsPerBundle) || l.unitsPerBundle <= 0
      || typeof l.bundlePrice !== "number" || !Number.isFinite(l.bundlePrice) || l.bundlePrice <= 0) return lines;
    const line: CartLine = {
      productId: String(l.productId), productName: String(l.productName), tierId: String(l.tierId),
      imageUrl: l.imageUrl, unitsPerBundle: l.unitsPerBundle, bundlePrice: l.bundlePrice,
      bundleQty: clampBundleQty(l.bundleQty),
    };
    return addLine(lines, line);
  }, []);
}

type Ctx = {
  lines: CartLine[];
  add: (l: CartLine) => void;
  setQty: (tierId: string, qty: unknown) => void;
  remove: (tierId: string) => void;
  clear: () => void;
};
const CartCtx = createContext<Ctx | null>(null);
const KEY = "medishop-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { setLines(restoreCart(JSON.parse(localStorage.getItem(KEY) || "[]"))); } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(lines)); }, [lines, ready]);
  return (
    <CartCtx.Provider value={{
      lines,
      add: (l) => setLines((p) => addLine(p, l)),
      setQty: (id, q) => setLines((p) => p.map((l) => (l.tierId === id ? { ...l, bundleQty: clampBundleQty(q) } : l))),
      remove: (id) => setLines((p) => p.filter((l) => l.tierId !== id)),
      clear: () => setLines([]),
    }}>{children}</CartCtx.Provider>
  );
}
export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
