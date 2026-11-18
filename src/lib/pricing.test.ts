import { describe, expect, it } from "vitest";
import { formatKWD, lineTotal, packCount } from "./pricing";
import { addLine, type CartLine } from "./cart";

const base: CartLine = { productId: "c", productName: "C", imageUrl: "", tierId: "t4", unitsPerBundle: 4, bundlePrice: 19.5, bundleQty: 2 };

describe("pricing rules", () => {
  it("line total is bundle price × bundle quantity (not per pack)", () => {
    expect(lineTotal(19.5, 2)).toBe(39);
  });
  it("internal packs = units per bundle × bundle quantity", () => {
    expect(packCount(12, 3)).toBe(36);
  });
  it("formats KWD with 3 decimals", () => {
    expect(formatKWD(5.5)).toBe("5.500 KWD");
  });
  it("different tiers of the same product are separate lines", () => {
    const lines = addLine([base], { ...base, tierId: "t12", unitsPerBundle: 12, bundlePrice: 55 });
    expect(lines).toHaveLength(2);
  });
  it("same tier merges into one line", () => {
    const lines = addLine([base], { ...base, bundleQty: 1 });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.bundleQty).toBe(3);
  });
});
