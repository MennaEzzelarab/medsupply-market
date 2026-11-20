import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Tier = { id: string; product_id: string; units_per_bundle: number; bundle_price: number };
export type Named = { id: string; name: string };
export type Product = {
  id: string; name: string; description: string; image_url: string;
  brand_id: string; category_id: string;
  brand: Named | null; category: Named | null; pricing_tiers: Tier[];
};

export type ProductSort = "name" | "price-asc" | "price-desc";
export type ProductFilters = {
  brand?: string | undefined;
  category?: string | undefined;
  q?: string | undefined;
  sort?: ProductSort | undefined;
};

function lowestTierPrice(product: Product): number | null {
  if (product.pricing_tiers.length === 0) return null;
  return Math.min(...product.pricing_tiers.map((tier) => tier.bundle_price));
}

export function filterAndSortProducts(products: Product[], filters: ProductFilters): Product[] {
  const query = filters.q?.trim().toLowerCase() ?? "";
  const filtered = products.filter((product) =>
    (!filters.brand || product.brand_id === filters.brand) &&
    (!filters.category || product.category_id === filters.category) &&
    (!query || `${product.name} ${product.description}`.toLowerCase().includes(query)),
  );

  return [...filtered].sort((a, b) => {
    if (filters.sort === "price-asc" || filters.sort === "price-desc") {
      const aPrice = lowestTierPrice(a);
      const bPrice = lowestTierPrice(b);
      if (aPrice === null || bPrice === null) {
        if (aPrice !== bPrice) return aPrice === null ? 1 : -1;
      } else if (aPrice !== bPrice) {
        return filters.sort === "price-asc" ? aPrice - bPrice : bPrice - aPrice;
      }
    }
    return a.name.localeCompare(b.name);
  });
}

const sel = "id,name,description,image_url,brand_id,category_id,brand:brands(id,name),category:categories(id,name),pricing_tiers(id,product_id,units_per_bundle,bundle_price)";

function norm(p: any): Product {
  return {
    ...p,
    pricing_tiers: [...(p.pricing_tiers ?? [])]
      .map((t: any) => ({ ...t, bundle_price: Number(t.bundle_price) }))
      .sort((a: Tier, b: Tier) => a.units_per_bundle - b.units_per_bundle),
  };
}

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select(sel).order("name");
    if (error) throw error;
    return (data ?? []).map(norm);
  },
});
// A malformed id can never match a row, and asking Postgres for it raises an error
// instead of returning nothing: resolve those ids to "not found" without a query.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export const productQuery = (id: string) => queryOptions({
  queryKey: ["products", id],
  queryFn: async () => {
    if (!isUuid(id)) return null;
    const { data, error } = await supabase.from("products").select(sel).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? norm(data) : null;
  },
});
export const brandsQuery = queryOptions({
  queryKey: ["brands"],
  queryFn: async () => {
    const { data, error } = await supabase.from("brands").select("id,name").order("name");
    if (error) throw error;
    return data as Named[];
  },
});
export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("id,name").order("name");
    if (error) throw error;
    return data as Named[];
  },
});
