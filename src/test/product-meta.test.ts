import { describe, expect, it } from "vitest";

import { Route } from "@/routes/product.$id";
import { productQuery, type Product } from "@/lib/catalog";

type HeadArgs = { params: { id: string }; loaderData?: Product | null };
type HeadResult = { meta: Record<string, string>[]; links: Record<string, string>[] };

const head = (Route.options as unknown as { head: (args: HeadArgs) => HeadResult }).head;

const ID = "11111111-1111-4111-8111-111111111111";

const product: Product = {
  id: ID,
  name: "Product C — Nitrile Exam Gloves",
  description: "Powder-free nitrile gloves.",
  image_url: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800",
  brand_id: "b1",
  category_id: "c1",
  brand: { id: "b1", name: "PureHealth" },
  category: { id: "c1", name: "Wound Care" },
  pricing_tiers: [{ id: "t1", product_id: ID, units_per_bundle: 12, bundle_price: 55 }],
};

function value(meta: Record<string, string>[], key: string): string | undefined {
  for (const entry of meta) {
    if (key === "title" && entry["title"] !== undefined) return entry["title"];
    if (entry["name"] === key || entry["property"] === key) return entry["content"];
  }
  return undefined;
}

function hasTag(meta: Record<string, string>[], key: string): boolean {
  return meta.some((entry) => entry["property"] === key || entry["name"] === key);
}

describe("product page head", () => {
  it("titles the loaded product with its name and the app name", () => {
    const { meta } = head({ params: { id: ID }, loaderData: product });
    const expected = "Product C — Nitrile Exam Gloves — MediShop";

    expect(value(meta, "title")).toBe(expected);
    expect(value(meta, "og:title")).toBe(expected);
    expect(value(meta, "og:description")).toBe("Powder-free nitrile gloves.");
  });

  it("falls back to a plain title when the product is missing or still loading", () => {
    for (const args of [{ params: { id: ID }, loaderData: null }, { params: { id: ID } }] as HeadArgs[]) {
      const { meta } = head(args);
      const title = value(meta, "title");

      expect(title).toBe("Product — MediShop");
      expect(value(meta, "og:title")).toBe("Product — MediShop");
      expect(hasTag(meta, "og:image")).toBe(false);
    }
  });

  it("shares the product photo at 1200x630 and points the page URL at itself", () => {
    const { meta, links } = head({ params: { id: ID }, loaderData: product });
    const share = value(meta, "og:image");

    expect(share).toContain("https://images.unsplash.com/photo-1583947215259-38e31be8751f");
    expect(share).toContain("w=1200");
    expect(share).toContain("h=630");
    expect(value(meta, "twitter:image")).toBe(share);
    expect(value(meta, "og:url")).toBe(`https://medbasket-tiered-market.lovable.app/product/${ID}`);
    expect(links[0]?.["href"]).toBe(`https://medbasket-tiered-market.lovable.app/product/${ID}`);
  });

  it("resolves a malformed id to not found without querying the database", async () => {
    const query = productQuery("not-a-uuid");
    const run = query.queryFn as () => Promise<Product | null>;

    expect(await run()).toBeNull();
  });
});
