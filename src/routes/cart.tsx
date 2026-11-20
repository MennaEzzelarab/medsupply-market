import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { cartTotal, clampBundleQty, formatKWD, lineTotal, packCount } from "@/lib/pricing";
import { Empty } from "@/components/states";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — MediShop" },
      { name: "description", content: "Review your bundles, quantities and totals in KWD." },
      { property: "og:title", content: "Your cart — MediShop" },
      { property: "og:description", content: "Review your bundles, quantities and totals in KWD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, setQty, remove, clear } = useCart();
  const [clearOpen, setClearOpen] = useState(false);
  const total = cartTotal(lines);
  if (lines.length === 0) return <Empty title="Your cart is empty"><Button asChild className="rounded-full"><Link to="/">Browse products</Link></Button></Empty>;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">Your cart</h1>
          <Button variant="outline" className="rounded-full" onClick={() => setClearOpen(true)}>
            <Trash2 className="h-4 w-4" />Clear cart
          </Button>
        </div>
        {lines.map((l) => (
          <div key={l.tierId} className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                {l.imageUrl && (
                  <img
                    src={l.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <Link to="/product/$id" params={{ id: l.productId }} className="font-bold hover:text-primary-deep">{l.productName}</Link>
                <p className="text-sm text-muted-foreground">{l.unitsPerBundle}-pack bundle · {formatKWD(l.bundlePrice)} / bundle</p>
                <p className="text-xs text-muted-foreground">{packCount(l.unitsPerBundle, l.bundleQty)} packs total</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="flex items-center rounded-full border">
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Decrease" onClick={() => setQty(l.tierId, l.bundleQty - 1)}><Minus className="h-4 w-4" /></Button>
                <CartQuantityInput key={l.bundleQty} qty={l.bundleQty} onCommit={(qty) => setQty(l.tierId, qty)} />
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Increase" onClick={() => setQty(l.tierId, l.bundleQty + 1)}><Plus className="h-4 w-4" /></Button>
              </div>
              <span className="w-28 text-right font-bold text-primary-deep">{formatKWD(lineTotal(l.bundlePrice, l.bundleQty))}</span>
              <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => remove(l.tierId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
      <aside className="h-fit space-y-4 rounded-3xl bg-primary-tint p-6">
        <h2 className="font-bold">Summary</h2>
        <div className="flex justify-between text-sm"><span>Lines</span><span>{lines.length}</span></div>
        <div className="flex justify-between border-t pt-4"><span className="font-semibold">Total</span><span className="text-xl font-extrabold text-primary-deep">{formatKWD(total)}</span></div>
      </aside>
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear your cart?"
        description="This will remove every product and bundle from your cart."
        confirmLabel="Clear cart"
        onConfirm={clear}
      />
    </div>
  );
}

function CartQuantityInput({ qty, onCommit }: { qty: number; onCommit: (qty: number) => void }) {
  const [value, setValue] = useState(String(qty));
  const commit = () => {
    const next = clampBundleQty(value);
    setValue(String(next));
    onCommit(next);
  };
  return <input type="number" min={1} max={99} step={1} value={value}
    onChange={(e) => setValue(e.target.value)} onBlur={commit}
    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
    className="w-12 bg-transparent text-center font-semibold outline-none" aria-label="Bundle quantity" />;
}
