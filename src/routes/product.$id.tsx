import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import { productQuery } from "@/lib/catalog";
import { clampBundleQty, formatKWD, lineTotal, packCount } from "@/lib/pricing";
import { useCart } from "@/lib/cart";
import { Loading, ErrorState, Empty } from "@/components/states";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product details — MediShop" },
      { name: "description", content: "Product details, brand, category and bundle pricing in KWD." },
      { property: "og:title", content: "Product details — MediShop" },
      { property: "og:description", content: "Product details, brand, category and bundle pricing in KWD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const q = useQuery(productQuery(id));
  const { add } = useCart();
  const [tierId, setTierId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  if (q.isLoading) return <Loading label="Loading product…" />;
  if (q.error) return <ErrorState error={q.error} />;
  const p = q.data;
  if (!p) return <Empty title="Product not found"><Link to="/" className="text-sm font-medium text-primary-deep underline">Back to shop</Link></Empty>;

  const tier = p.pricing_tiers.find((t) => t.id === tierId) ?? p.pricing_tiers[0];

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-primary-deep"><ArrowLeft className="h-4 w-4" />Back to shop</Link>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl bg-muted">{p.image_url && <img src={p.image_url} alt={p.name} className="aspect-square w-full object-cover" />}</div>
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-primary-tint px-3 py-1 text-primary-deep">{p.brand?.name}</span>
              <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">{p.category?.name}</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{p.name}</h1>
            <p className="mt-3 text-muted-foreground">{p.description}</p>
          </div>
          {!tier ? <Empty title="This product has no pricing tiers yet" /> : <>
            <div>
              <p className="mb-2 text-sm font-semibold">Choose a bundle</p>
              <div className="grid gap-2">
                {p.pricing_tiers.map((t) => (
                  <Button key={t.id} type="button" variant="outline" onClick={() => setTierId(t.id)}
                    className={`flex h-auto items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition ${t.id === tier.id ? "border-primary bg-primary-tint" : "border-border hover:border-primary/50"}`}>
                    <span className="font-medium">{t.units_per_bundle} {t.units_per_bundle === 1 ? "pack" : "packs"} per bundle</span>
                    <span className="font-bold text-primary-deep">{formatKWD(t.bundle_price)}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold">Bundles</p>
              <div className="flex items-center rounded-full border">
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Decrease" onClick={() => setQty((v) => clampBundleQty(v - 1))}><Minus className="h-4 w-4" /></Button>
                <input type="number" min={1} max={99} step={1} value={qty} onChange={(e) => setQty(clampBundleQty(e.target.value))} className="w-14 bg-transparent text-center font-semibold outline-none" aria-label="Bundle quantity" />
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Increase" onClick={() => setQty((v) => clampBundleQty(v + 1))}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="rounded-2xl bg-muted p-5">
              <div className="flex justify-between text-sm text-muted-foreground"><span>Total packs</span><span>{packCount(tier.units_per_bundle, qty)}</span></div>
              <div className="mt-2 flex items-end justify-between"><span className="font-semibold">Total</span><span className="text-2xl font-extrabold text-primary-deep">{formatKWD(lineTotal(tier.bundle_price, qty))}</span></div>
            </div>
            <Button size="lg" className="w-full rounded-full" onClick={() => {
              add({ productId: p.id, productName: p.name, imageUrl: p.image_url, tierId: tier.id, unitsPerBundle: tier.units_per_bundle, bundlePrice: tier.bundle_price, bundleQty: qty });
              toast.success("Added to cart");
            }}><ShoppingCart className="h-4 w-4" />Add to cart</Button>
          </>}
        </div>
      </div>
    </div>
  );
}
