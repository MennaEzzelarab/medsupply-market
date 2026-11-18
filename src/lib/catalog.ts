import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Tier = { id: string; product_id: string; units_per_bundle: number; bundle_price: number };
export type Named = { id: string; name: string };
export type Product = {
  id: string; name: string; description: string; image_url: string;
  brand_id: string; category_id: string;
  brand: Named | null; category: Named | null; pricing_tiers: Tier[];
};

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
export const productQuery = (id: string) => queryOptions({
  queryKey: ["products", id],
  queryFn: async () => {
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
