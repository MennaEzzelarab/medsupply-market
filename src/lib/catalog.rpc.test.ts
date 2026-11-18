import { expect, it } from "vitest";
import { supabase } from "@/integrations/supabase/client";

it("saves tier diffs atomically, preserves IDs, and restricts referenced brand/category deletion", async () => {
  const suffix = crypto.randomUUID();
  const brand = await supabase.from("brands").insert({ name: `Test brand ${suffix}` }).select("id").single();
  const category = await supabase.from("categories").insert({ name: `Test category ${suffix}` }).select("id").single();
  expect(brand.error).toBeNull();
  expect(category.error).toBeNull();
  if (!brand.data || !category.data) throw new Error("Test fixtures could not be created");
  let productId: string | undefined;
  try {
    const args = { p_name: `Test product ${suffix}`, p_brand_id: brand.data.id, p_category_id: category.data.id,
      p_tiers: [{ units_per_bundle: 1, bundle_price: 5.5 }, { units_per_bundle: 4, bundle_price: 19.5 }] };
    const created = await supabase.rpc("save_product", args);
    expect(created.error).toBeNull();
    if (!created.data) throw new Error("Test product could not be created");
    productId = created.data;
    const original = await supabase.from("pricing_tiers").select("*").eq("product_id", productId).order("units_per_bundle");
    const first = original.data?.[0];
    const second = original.data?.[1];
    if (!first || !second) throw new Error("Initial tiers are missing");
    const swapped = await supabase.rpc("save_product", { ...args, p_id: productId, p_tiers: [
      { id: first.id, units_per_bundle: 4, bundle_price: 20 },
      { id: second.id, units_per_bundle: 1, bundle_price: 6 },
    ] });
    expect(swapped.error).toBeNull();
    const edited = await supabase.from("pricing_tiers").select("*").eq("product_id", productId);
    expect(edited.data?.find((t) => t.id === first.id)?.units_per_bundle).toBe(4);
    expect(edited.data?.find((t) => t.id === second.id)?.bundle_price).toBe(6);
    const diff = await supabase.rpc("save_product", { ...args, p_id: productId, p_tiers: [
      { id: first.id, units_per_bundle: 4, bundle_price: 19.5 }, { units_per_bundle: 12, bundle_price: 55 },
    ] });
    expect(diff.error).toBeNull();
    const before = await supabase.from("pricing_tiers").select("*").eq("product_id", productId).order("units_per_bundle");
    expect(before.data).toHaveLength(2);
    expect(before.data?.[0]?.id).toBe(first.id);
    expect(before.data?.some((t) => t.id === second.id)).toBe(false);
    const failed = await supabase.rpc("save_product", { ...args, p_id: productId, p_name: "Must roll back", p_tiers: [
      { id: first.id, units_per_bundle: 4, bundle_price: 19.5 }, { units_per_bundle: 12, bundle_price: -1 },
    ] });
    expect(failed.error).not.toBeNull();
    const after = await supabase.from("pricing_tiers").select("*").eq("product_id", productId).order("units_per_bundle");
    expect(after.data).toEqual(before.data);
    const product = await supabase.from("products").select("name").eq("id", productId).single();
    expect(product.data?.name).toBe(args.p_name);
    const brandDelete = await supabase.from("brands").delete().eq("id", brand.data.id);
    const categoryDelete = await supabase.from("categories").delete().eq("id", category.data.id);
    expect(brandDelete.error?.code).toBe("23503");
    expect(categoryDelete.error?.code).toBe("23503");
  } finally {
    if (productId) await supabase.from("products").delete().eq("id", productId);
    await supabase.from("brands").delete().eq("id", brand.data.id);
    await supabase.from("categories").delete().eq("id", category.data.id);
  }
}, 30000);