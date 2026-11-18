import { describe, expect, it } from "vitest";
import { cartTotal, clampBundleQty, formatKWD, lineTotal, packCount } from "./pricing";
import { addLine, restoreCart, type CartLine } from "./cart";

const base: CartLine = { productId: "c", productName: "C", imageUrl: "", tierId: "t4", unitsPerBundle: 4, bundlePrice: 19.5, bundleQty: 2 };

describe("pricing rules", () => {
  it("line total is bundle price × bundle quantity (not per pack)", () => {
    expect(lineTotal(19.5, 2)).toBe(39);
    expect(formatKWD(lineTotal(19.5, 2))).toBe("39.000 KWD");
    expect(packCount(4, 2)).toBe(8);
  });
  it("internal packs = units per bundle × bundle quantity", () => {
    expect(packCount(12, 3)).toBe(36);
  });
  it("formats KWD with 3 decimals", () => {
    expect(formatKWD(5.5)).toBe("5.500 KWD");
    expect(formatKWD(0)).toBe("0.000 KWD");
  });
  it("different tiers of the same product are separate lines", () => {
    const lines = addLine([base], { ...base, tierId: "t12", unitsPerBundle: 12, bundlePrice: 55 });
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.tierId)).toEqual(["t4", "t12"]);
  });
  it("same tier merges into one line", () => {
    const lines = addLine([base], { ...base, bundleQty: 1 });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.bundleQty).toBe(3);
  });
  it.each([
    [0, 1], [-3, 1], [2.7, 2], [NaN, 1], ["", 1], [Infinity, 1], [1000, 99],
    ["bad", 1], [" ", 1], ["2.7", 2], [undefined, 1], [null, 1], [true, 1], [{}, 1],
  ])("clamps %s to %s", (input, expected) => {
    expect(clampBundleQty(input)).toBe(expected);
  });
  it("supports a custom maximum", () => {
    expect(clampBundleQty(1000, 12)).toBe(12);
    expect(clampBundleQty(2.7, 12)).toBe(2);
  });
  it("clamps new, merged and restored quantities", () => {
    expect(addLine([], { ...base, bundleQty: 1000 })[0]?.bundleQty).toBe(99);
    expect(addLine([{ ...base, bundleQty: 98 }], base)[0]?.bundleQty).toBe(99);
    expect(restoreCart([{ ...base, bundleQty: 2.7 }])[0]?.bundleQty).toBe(2);
    expect(restoreCart([{ ...base, bundleQty: "" }])[0]?.bundleQty).toBe(1);
  });
  it("drops corrupt stored lines and invalid price or units", () => {
    const invalid = [null, {}, { ...base, tierId: "" }, { ...base, imageUrl: 7 },
      { ...base, bundlePrice: 0 }, { ...base, bundlePrice: -1 }, { ...base, bundlePrice: Infinity },
      { ...base, unitsPerBundle: 0 }, { ...base, unitsPerBundle: -1 }, { ...base, unitsPerBundle: 2.7 }];
    expect(restoreCart([...invalid, base])).toEqual([base]);
    expect(restoreCart({})).toEqual([]);
  });
  it("sums several line totals using integer fils", () => {
    expect(cartTotal([base, { bundlePrice: 55, bundleQty: 2 }, { bundlePrice: 5.5, bundleQty: 3 }])).toBe(165.5);
    expect(cartTotal([{ bundlePrice: 0.1, bundleQty: 1 }, { bundlePrice: 0.2, bundleQty: 1 }])).toBe(0.3);
    expect(cartTotal([])).toBe(0);
  });
});
