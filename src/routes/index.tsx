import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search as SearchIcon, ShoppingCart } from "lucide-react";
import { filterAndSortProducts, productsQuery, brandsQuery, categoriesQuery, type Product, type Named, type ProductSort } from "@/lib/catalog";
import { formatKWD } from "@/lib/pricing";
import { useCart } from "@/lib/cart";
import { Loading, ErrorState, Empty } from "@/components/states";
import { Button } from "@/components/ui/button";

type ProductSearch = { brand?: string | undefined; category?: string | undefined; q?: string | undefined; sort?: ProductSort | undefined };

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): ProductSearch => ({
    brand: typeof s["brand"] === "string" ? s["brand"] : undefined,
    category: typeof s["category"] === "string" ? s["category"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: s["sort"] === "price-asc" || s["sort"] === "price-desc" || s["sort"] === "name" ? s["sort"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop medical supplies — MediShop" },
      { name: "description", content: "Browse medical supplies by brand and category with bundle pricing in KWD." },
      { property: "og:title", content: "Shop medical supplies — MediShop" },
      { property: "og:description", content: "Browse medical supplies by brand and category with bundle pricing in KWD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function FilterList({ title, items, active, param }: { title: string; items: Named[]; active?: string | undefined; param: "brand" | "category" }) {
  const chip = (on: boolean) => `rounded-full border px-4 py-1.5 text-sm font-medium transition ${on ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:border-primary hover:text-primary-deep"}`;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        <Link to="/" search={(p: ProductSearch) => ({ ...p, [param]: undefined }) as ProductSearch} className={chip(!active)}>All</Link>
        {items.map((i) => (
          <Link key={i.id} to="/" search={(p: ProductSearch) => ({ ...p, [param]: i.id }) as ProductSearch} className={chip(active === i.id)}>{i.name}</Link>
        ))}
      </div>
    </div>
  );
}

function Home() {
  const { brand, category, q = "", sort = "name" } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const products = useQuery(productsQuery);
  const brands = useQuery(brandsQuery);
  const cats = useQuery(categoriesQuery);

  const list = filterAndSortProducts(products.data ?? [], { brand, category, q, sort });

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-primary-tint px-6 py-10 sm:px-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Medical supplies, <span className="text-primary-deep">bundled smarter.</span></h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Pick the bundle size that suits you — bigger bundles, better value.</p>
      </section>

      <section className="space-y-4">
        {brands.data && <FilterList title="Brands" items={brands.data} active={brand} param="brand" />}
        {cats.data && <FilterList title="Categories" items={cats.data} active={category} param="category" />}
      </section>

      <section className="space-y-3" aria-label="Product search and sorting">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="product-search" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search products</label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="product-search"
                type="search"
                value={q}
                onChange={(event) => {
                  const value = event.target.value;
                  void navigate({ replace: true, search: (previous: ProductSearch) => ({ ...previous, q: value || undefined }) });
                }}
                placeholder="Search by name or description"
                className="w-full rounded-full border bg-background py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="sm:w-56">
            <label htmlFor="product-sort" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort by</label>
            <select
              id="product-sort"
              value={sort}
              onChange={(event) => {
                const value = event.target.value as ProductSort;
                void navigate({ replace: true, search: (previous: ProductSearch) => ({ ...previous, sort: value }) });
              }}
              className="w-full rounded-full border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="name">Name A–Z</option>
              <option value="price-asc">Price low to high</option>
              <option value="price-desc">Price high to low</option>
            </select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">{list.length} {list.length === 1 ? "product" : "products"}</p>
      </section>

      {products.isLoading ? <Loading label="Loading products…" /> :
        products.error ? <ErrorState error={products.error} /> :
          list.length === 0 ? <Empty title="No products match these filters"><Link to="/" search={{}} className="text-sm font-medium text-primary-deep underline">Clear filters</Link></Empty> :
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
    </div>
  );
}

function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  const navigate = useNavigate();
  const [tierId, setTierId] = useState<string | null>(null);
  const selected = p.pricing_tiers.find((t) => t.id === tierId) ?? p.pricing_tiers[0];
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border bg-card shadow-sm transition hover:shadow-md">
      <Link to="/product/$id" params={{ id: p.id }} className="aspect-[4/3] overflow-hidden bg-muted">
        {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />}
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-deep">{p.brand?.name} · {p.category?.name}</p>
          <Link to="/product/$id" params={{ id: p.id }} className="mt-1 block font-bold hover:text-primary-deep">{p.name}</Link>
        </div>
        <ul className="space-y-1.5" aria-label={`${p.name} bundle options`}>
          {p.pricing_tiers.map((t) => (
            <li key={t.id}>
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${selected?.id === t.id ? "border-primary bg-primary-tint" : "border-transparent bg-muted"}`}>
                <input type="radio" name={`tier-${p.id}`} checked={selected?.id === t.id} onChange={() => setTierId(t.id)} className="accent-primary" />
                <span className="flex-1">{t.units_per_bundle} {t.units_per_bundle === 1 ? "pack" : "packs"}</span>
                <span className="font-semibold">{formatKWD(t.bundle_price)}</span>
              </label>
            </li>
          ))}
          {p.pricing_tiers.length === 0 && <li className="text-sm text-muted-foreground">No pricing yet</li>}
        </ul>
        <div className="mt-auto flex gap-2">
          <Button asChild variant="outline" className="flex-1 rounded-full"><Link to="/product/$id" params={{ id: p.id }}>Details</Link></Button>
          <Button className="flex-1 rounded-full" disabled={!selected} onClick={() => {
            if (!selected) return;
            add({ productId: p.id, productName: p.name, imageUrl: p.image_url, tierId: selected.id, unitsPerBundle: selected.units_per_bundle, bundlePrice: selected.bundle_price, bundleQty: 1 });
            toast.success(`Added ${p.name} (${selected.units_per_bundle}-pack bundle)`, {
              action: { label: "View cart", onClick: () => void navigate({ to: "/cart" }) },
            });
          }}><ShoppingCart className="h-4 w-4" />Add</Button>
        </div>
      </div>
    </article>
  );
}
