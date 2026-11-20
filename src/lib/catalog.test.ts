import { describe, expect, it } from "vitest";
import { filterAndSortProducts, type Product } from "./catalog";

function product(
  id: string,
  name: string,
  description: string,
  brandId: string,
  categoryId: string,
  prices: number[],
): Product {
  return {
    id,
    name,
    description,
    image_url: "",
    brand_id: brandId,
    category_id: categoryId,
    brand: null,
    category: null,
    pricing_tiers: prices.map((bundle_price, index) => ({
      id: `${id}-tier-${index}`,
      product_id: id,
      units_per_bundle: index + 1,
      bundle_price,
    })),
  };
}

const products = [
  product("a", "Paracetamol", "Pain relief tablets", "medi", "medicine", [10, 5]),
  product("b", "Bandage", "STERILE wound dressing", "pure", "wound", [8, 3]),
  product("c", "Thermometer", "Digital temperature reader", "medi", "diagnostic", [7]),
  product("d", "Unpriced", "Coming soon", "pure", "wound", []),
];

describe("product filtering and sorting", () => {
  it("matches trimmed, case-insensitive queries against names and descriptions", () => {
    expect(filterAndSortProducts(products, { q: "  paracetamol  " }).map((p) => p.id)).toEqual(["a"]);
    expect(filterAndSortProducts(products, { q: "sterile" }).map((p) => p.id)).toEqual(["b"]);
  });

  it("combines search with brand and category filters", () => {
    expect(filterAndSortProducts(products, { q: "reader", brand: "medi", category: "diagnostic" }).map((p) => p.id)).toEqual(["c"]);
    expect(filterAndSortProducts(products, { q: "reader", brand: "pure", category: "diagnostic" })).toEqual([]);
  });

  it("sorts names A to Z", () => {
    expect(filterAndSortProducts(products, { sort: "name" }).map((p) => p.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("sorts prices low to high using each product's lowest tier", () => {
    expect(filterAndSortProducts(products, { sort: "price-asc" }).map((p) => p.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("sorts prices high to low and leaves unpriced products last", () => {
    expect(filterAndSortProducts(products, { sort: "price-desc" }).map((p) => p.id)).toEqual(["c", "a", "b", "d"]);
  });
});
