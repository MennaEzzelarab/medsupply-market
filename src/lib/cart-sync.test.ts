import { describe, expect, it } from "vitest";
import { describeChange, reconcileCart, type CurrentTier } from "./cart-sync";
import type { CartLine } from "./cart";
import { cartTotal, formatKWD } from "./pricing";

const baseLine: CartLine = {
  productId: "prod-1",
  productName: "Digital Thermometer",
  imageUrl: "https://example.com/thermometer.jpg",
  tierId: "tier-1",
  unitsPerBundle: 4,
  bundlePrice: 26,
  bundleQty: 2,
};

const baseTier: CurrentTier = {
  tierId: "tier-1",
  productId: "prod-1",
  productName: "Digital Thermometer",
  imageUrl: "https://example.com/thermometer.jpg",
  unitsPerBundle: 4,
  bundlePrice: 26,
};

describe("reconcileCart", () => {
  it("unchanged cart returns the same reference and no changes", () => {
    const lines = [baseLine];
    const current = [baseTier];
    const result = reconcileCart(lines, current);

    expect(result.lines).toBe(lines);
    expect(result.changes).toEqual([]);
  });

  it("handles price changed", () => {
    const lines = [baseLine];
    const current = [{ ...baseTier, bundlePrice: 24.5 }];
    const result = reconcileCart(lines, current);

    expect(result.lines).not.toBe(lines);
    expect(result.lines[0]?.bundlePrice).toBe(24.5);
    expect(result.lines[0]?.bundleQty).toBe(2);
    expect(result.changes).toEqual([
      {
        type: "updated",
        tierId: "tier-1",
        productName: "Digital Thermometer",
        oldUnits: 4,
        newUnits: 4,
        oldPrice: 26,
        newPrice: 24.5,
      },
    ]);
  });

  it("handles units changed", () => {
    const lines = [baseLine];
    const current = [{ ...baseTier, unitsPerBundle: 6, bundlePrice: 30 }];
    const result = reconcileCart(lines, current);

    expect(result.lines).not.toBe(lines);
    expect(result.lines[0]?.unitsPerBundle).toBe(6);
    expect(result.lines[0]?.bundlePrice).toBe(30);
    expect(result.changes).toEqual([
      {
        type: "updated",
        tierId: "tier-1",
        productName: "Digital Thermometer",
        oldUnits: 4,
        newUnits: 6,
        oldPrice: 26,
        newPrice: 30,
      },
    ]);
  });

  it("name/image-only change is silent (no changes entry, but fields updated)", () => {
    const lines = [baseLine];
    const current = [
      {
        ...baseTier,
        productName: "Digital Thermometer Pro",
        imageUrl: "https://example.com/pro.jpg",
      },
    ];
    const result = reconcileCart(lines, current);

    expect(result.lines).not.toBe(lines);
    expect(result.lines[0]?.productName).toBe("Digital Thermometer Pro");
    expect(result.lines[0]?.imageUrl).toBe("https://example.com/pro.jpg");
    expect(result.lines[0]?.bundlePrice).toBe(26);
    expect(result.changes).toEqual([]);
  });

  it("handles tier deleted → removed", () => {
    const lines = [baseLine];
    const current: CurrentTier[] = [];
    const result = reconcileCart(lines, current);

    expect(result.lines).toEqual([]);
    expect(result.changes).toEqual([
      {
        type: "removed",
        tierId: "tier-1",
        productName: "Digital Thermometer",
        unitsPerBundle: 4,
      },
    ]);
  });

  it("handles mixed changes in one cart", () => {
    const line2: CartLine = {
      productId: "prod-2",
      productName: "Nitrile Gloves",
      imageUrl: "",
      tierId: "tier-2",
      unitsPerBundle: 12,
      bundlePrice: 55,
      bundleQty: 1,
    };
    const line3: CartLine = {
      productId: "prod-3",
      productName: "Sterile Gauze",
      imageUrl: "",
      tierId: "tier-3",
      unitsPerBundle: 1,
      bundlePrice: 2.25,
      bundleQty: 5,
    };
    const lines = [baseLine, line2, line3];

    // baseLine: unchanged
    // line2: price updated from 55 to 52
    // line3: deleted
    const current: CurrentTier[] = [
      baseTier,
      {
        tierId: "tier-2",
        productId: "prod-2",
        productName: "Nitrile Gloves",
        imageUrl: "",
        unitsPerBundle: 12,
        bundlePrice: 52,
      },
    ];

    const result = reconcileCart(lines, current);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.tierId).toBe("tier-1");
    expect(result.lines[0]?.bundlePrice).toBe(26);
    expect(result.lines[1]?.tierId).toBe("tier-2");
    expect(result.lines[1]?.bundlePrice).toBe(52);
    expect(result.changes).toEqual([
      {
        type: "updated",
        tierId: "tier-2",
        productName: "Nitrile Gloves",
        oldUnits: 12,
        newUnits: 12,
        oldPrice: 55,
        newPrice: 52,
      },
      {
        type: "removed",
        tierId: "tier-3",
        productName: "Sterile Gauze",
        unitsPerBundle: 1,
      },
    ]);
  });

  it("handles empty cart", () => {
    const lines: CartLine[] = [];
    const current = [baseTier];
    const result = reconcileCart(lines, current);

    expect(result.lines).toBe(lines);
    expect(result.changes).toEqual([]);
  });

  it("bundleQty is preserved and clamped", () => {
    const lines: CartLine[] = [
      { ...baseLine, bundleQty: 3 },
      { ...baseLine, tierId: "tier-2", bundleQty: 150 },
      { ...baseLine, tierId: "tier-3", bundleQty: -5 },
    ];
    const current: CurrentTier[] = [
      baseTier,
      { ...baseTier, tierId: "tier-2" },
      { ...baseTier, tierId: "tier-3" },
    ];
    const result = reconcileCart(lines, current);

    expect(result.lines[0]?.bundleQty).toBe(3);
    expect(result.lines[1]?.bundleQty).toBe(99);
    expect(result.lines[2]?.bundleQty).toBe(1);
  });

  it("is idempotent: running twice gives no changes the second time", () => {
    const lines = [baseLine];
    const current = [{ ...baseTier, bundlePrice: 28, unitsPerBundle: 5 }];

    const first = reconcileCart(lines, current);
    expect(first.changes).toHaveLength(1);

    const second = reconcileCart(first.lines, current);
    expect(second.lines).toBe(first.lines);
    expect(second.changes).toEqual([]);
  });

  it("worked example: 2 × 4-pack at 19.500 KWD totals 39.000, and after price change to 20.000 totals 40.000", () => {
    const initialLine: CartLine = {
      productId: "c",
      productName: "Product C",
      imageUrl: "",
      tierId: "tier-4",
      unitsPerBundle: 4,
      bundlePrice: 19.5,
      bundleQty: 2,
    };
    expect(cartTotal([initialLine])).toBe(39);
    expect(formatKWD(cartTotal([initialLine]))).toBe("39.000 KWD");

    const current: CurrentTier = {
      tierId: "tier-4",
      productId: "c",
      productName: "Product C",
      imageUrl: "",
      unitsPerBundle: 4,
      bundlePrice: 20,
    };

    const { lines: reconciledLines, changes } = reconcileCart([initialLine], [current]);
    expect(cartTotal(reconciledLines)).toBe(40);
    expect(formatKWD(cartTotal(reconciledLines))).toBe("40.000 KWD");
    expect(changes).toEqual([
      {
        type: "updated",
        tierId: "tier-4",
        productName: "Product C",
        oldUnits: 4,
        newUnits: 4,
        oldPrice: 19.5,
        newPrice: 20,
      },
    ]);
  });
});

describe("describeChange", () => {
  it("describes removed items", () => {
    const text = describeChange({
      type: "removed",
      tierId: "t1",
      productName: "Nitrile Exam Gloves",
      unitsPerBundle: 4,
    });
    expect(text).toBe("Nitrile Exam Gloves (4-pack) is no longer available and was removed from your cart.");
  });

  it("describes price-only updates", () => {
    const text = describeChange({
      type: "updated",
      tierId: "t1",
      productName: "Digital Thermometer",
      oldUnits: 4,
      newUnits: 4,
      oldPrice: 26,
      newPrice: 24.5,
    });
    expect(text).toBe("Digital Thermometer (4-pack): price changed from 26.000 KWD to 24.500 KWD.");
  });

  it("describes units changed updates", () => {
    const text = describeChange({
      type: "updated",
      tierId: "t1",
      productName: "Nitrile Exam Gloves",
      oldUnits: 4,
      newUnits: 6,
      oldPrice: 19.5,
      newPrice: 21,
    });
    expect(text).toBe(
      "Nitrile Exam Gloves: bundle size changed from 4-pack to 6-pack (price 19.500 KWD → 21.000 KWD).",
    );
  });
});

