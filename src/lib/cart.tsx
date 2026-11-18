import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartLine = {
  productId: string; productName: string; imageUrl: string;
  tierId: string; unitsPerBundle: number; bundlePrice: number; bundleQty: number;
};

export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const i = lines.findIndex((l) => l.tierId === line.tierId);
  if (i === -1) return [...lines, line];
  return lines.map((l, j) => (j === i ? { ...l, bundleQty: l.bundleQty + line.bundleQty } : l));
}

type Ctx = {
  lines: CartLine[];
  add: (l: CartLine) => void;
  setQty: (tierId: string, qty: number) => void;
  remove: (tierId: string) => void;
  clear: () => void;
};
const CartCtx = createContext<Ctx | null>(null);
const KEY = "medishop-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { setLines(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(lines)); }, [lines, ready]);
  return (
    <CartCtx.Provider value={{
      lines,
      add: (l) => setLines((p) => addLine(p, l)),
      setQty: (id, q) => setLines((p) => p.map((l) => (l.tierId === id ? { ...l, bundleQty: Math.max(1, q) } : l))),
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
