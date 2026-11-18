import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatKWD, lineTotal, packCount } from "@/lib/pricing";
import { Empty } from "@/components/states";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — MediShop" },
      { name: "description", content: "Review your bundles, quantities and totals in KWD." },
      { property: "og:title", content: "Your cart — MediShop" },
      { property: "og:description", content: "Review your bundles, quantities and totals in KWD." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, setQty, remove } = useCart();
  const total = lines.reduce((s, l) => s + lineTotal(l.bundlePrice, l.bundleQty), 0);
  if (lines.length === 0) return <Empty title="Your cart is empty"><Button asChild className="rounded-full"><Link to="/">Browse products</Link></Button></Empty>;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">Your cart</h1>
        {lines.map((l) => (
          <div key={l.tierId} className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted">{l.imageUrl && <img src={l.imageUrl} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0">
                <Link to="/product/$id" params={{ id: l.productId }} className="font-bold hover:text-primary-deep">{l.productName}</Link>
                <p className="text-sm text-muted-foreground">{l.unitsPerBundle}-pack bundle · {formatKWD(l.bundlePrice)} / bundle</p>
                <p className="text-xs text-muted-foreground">{packCount(l.unitsPerBundle, l.bundleQty)} packs total</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="flex items-center rounded-full border">
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Decrease" onClick={() => setQty(l.tierId, l.bundleQty - 1)}><Minus className="h-4 w-4" /></Button>
                <input type="number" min={1} value={l.bundleQty} onChange={(e) => setQty(l.tierId, Number(e.target.value) || 1)} className="w-12 bg-transparent text-center font-semibold outline-none" aria-label="Bundle quantity" />
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
    </div>
  );
}
