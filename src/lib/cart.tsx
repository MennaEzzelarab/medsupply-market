import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { clampBundleQty } from "./pricing";
import {
  fetchCurrentTiers,
  reconcileCart,
  type CartChange,
} from "./cart-sync";

export type CartLine = {
  productId: string;
  productName: string;
  imageUrl: string;
  tierId: string;
  unitsPerBundle: number;
  bundlePrice: number;
  bundleQty: number;
};

export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const i = lines.findIndex((l) => l.tierId === line.tierId);
  if (i === -1) return [...lines, { ...line, bundleQty: clampBundleQty(line.bundleQty) }];
  return lines.map((l, j) =>
    j === i ? { ...l, bundleQty: clampBundleQty(l.bundleQty + clampBundleQty(line.bundleQty)) } : l,
  );
}

export function restoreCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<CartLine[]>((lines, item: unknown) => {
    if (!item || typeof item !== "object") return lines;
    const l = item as { [K in keyof CartLine]?: unknown };
    if (
      ![l.productId, l.productName, l.tierId].every((v) => typeof v === "string" && v.trim().length > 0) ||
      typeof l.imageUrl !== "string" ||
      typeof l.unitsPerBundle !== "number" ||
      !Number.isInteger(l.unitsPerBundle) ||
      l.unitsPerBundle <= 0 ||
      typeof l.bundlePrice !== "number" ||
      !Number.isFinite(l.bundlePrice) ||
      l.bundlePrice <= 0
    )
      return lines;
    const line: CartLine = {
      productId: String(l.productId),
      productName: String(l.productName),
      tierId: String(l.tierId),
      imageUrl: l.imageUrl,
      unitsPerBundle: l.unitsPerBundle,
      bundlePrice: l.bundlePrice,
      bundleQty: clampBundleQty(l.bundleQty),
    };
    return addLine(lines, line);
  }, []);
}

function changeDedupeKey(c: CartChange): string {
  if (c.type === "removed") {
    return `${c.type}-${c.tierId}`;
  }
  return `${c.type}-${c.tierId}-${c.newPrice}-${c.newUnits}`;
}

type Ctx = {
  lines: CartLine[];
  add: (l: CartLine) => void;
  setQty: (tierId: string, qty: unknown) => void;
  remove: (tierId: string) => void;
  clear: () => void;
  syncError: boolean;
  notices: CartChange[];
  dismissNotices: () => void;
  refresh: () => void;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "medishop-cart";
const NOTICES_KEY = "medishop-cart-notices";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [notices, setNotices] = useState<CartChange[]>([]);
  const toastedKeysRef = useRef(new Set<string>());
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      setLines(restoreCart(JSON.parse(localStorage.getItem(KEY) || "[]")));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NOTICES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setNotices(parsed);
          for (const c of parsed) {
            toastedKeysRef.current.add(changeDedupeKey(c));
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const sortedTierIds = useMemo(() => {
    return [...new Set(lines.map((l) => l.tierId))].sort();
  }, [lines]);

  const syncQuery = useQuery({
    queryKey: ["cart-sync", sortedTierIds],
    queryFn: () => fetchCurrentTiers(sortedTierIds),
    enabled: ready && sortedTierIds.length > 0,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 1,
  });

  const syncError = sortedTierIds.length > 0 && syncQuery.isError;

  useEffect(() => {
    if (!syncQuery.isSuccess || !syncQuery.data) return;

    const currentTiers = syncQuery.data;
    const { lines: reconciledLines, changes } = reconcileCart(lines, currentTiers);

    if (reconciledLines !== lines) {
      const tierMap = new Map(currentTiers.map((t) => [t.tierId, t]));
      setLines((prev) => {
        const next: CartLine[] = [];
        for (const line of prev) {
          const cur = tierMap.get(line.tierId);
          if (!cur) continue;
          next.push({
            ...line,
            productId: cur.productId,
            productName: cur.productName,
            imageUrl: cur.imageUrl,
            unitsPerBundle: cur.unitsPerBundle,
            bundlePrice: cur.bundlePrice,
            bundleQty: clampBundleQty(line.bundleQty),
          });
        }
        return next;
      });
    }

    if (changes.length > 0) {
      setNotices((prevNotices) => {
        const existingKeys = new Set(prevNotices.map(changeDedupeKey));
        const toAdd: CartChange[] = [];
        for (const c of changes) {
          const key = changeDedupeKey(c);
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            toAdd.push(c);
          }
        }
        if (toAdd.length === 0) return prevNotices;
        const merged = [...prevNotices, ...toAdd];
        try {
          sessionStorage.setItem(NOTICES_KEY, JSON.stringify(merged));
        } catch {
          /* ignore */
        }
        return merged;
      });

      const unToasted = changes.filter((c) => {
        const key = changeDedupeKey(c);
        if (toastedKeysRef.current.has(key)) return false;
        toastedKeysRef.current.add(key);
        return true;
      });

      if (unToasted.length > 0) {
        const count = changes.length;
        const countLabel = count === 1 ? "1 change" : `${count} changes`;
        toast.info(`Your cart was updated: ${countLabel}`, {
          action: {
            label: "View cart",
            onClick: () => void navigate({ to: "/cart" }),
          },
        });
      }
    }
  }, [syncQuery.isSuccess, syncQuery.data, lines, navigate]);

  const dismissNotices = useCallback(() => {
    setNotices([]);
    try {
      sessionStorage.removeItem(NOTICES_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["cart-sync"] });
  }, [qc]);

  return (
    <CartCtx.Provider
      value={{
        lines,
        add: (l) => setLines((p) => addLine(p, l)),
        setQty: (id, q) =>
          setLines((p) => p.map((l) => (l.tierId === id ? { ...l, bundleQty: clampBundleQty(q) } : l))),
        remove: (id) => setLines((p) => p.filter((l) => l.tierId !== id)),
        clear: () => setLines([]),
        syncError,
        notices,
        dismissNotices,
        refresh,
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
