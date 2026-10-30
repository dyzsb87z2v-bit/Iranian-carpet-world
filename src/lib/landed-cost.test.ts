import { describe, expect, it } from "vitest";
import { estimateLandedCost, estimateWeightKg, suggestEurPrice } from "./landed-cost";

describe("landed cost", () => {
  it("estimates weight from size and weave", () => {
    // 3m × 2m hand-knotted = 6 m² × 3.2 + 1.5 packaging
    expect(estimateWeightKg(300, 200, "hand_knotted")).toBe(20.7);
  });

  it("applies duty on CIF and VAT on CIF + duty for Germany", () => {
    const c = estimateLandedCost({ priceEur: 2000, lengthCm: 300, widthCm: 200, weave: "hand_knotted", destination: "DE" });
    expect(c.shipping).toBe(215.25); // 60 + 7.5 × 20.7
    expect(c.insurance).toBe(30);
    const cif = 2000 + 215.25 + 30;
    expect(c.duty).toBeCloseTo(cif * 0.03, 2);
    expect(c.importVat).toBeCloseTo((cif + c.duty) * 0.19, 1);
    expect(c.total).toBeCloseTo(c.goods + c.shipping + c.insurance + c.duty + c.importVat + c.clearance, 2);
  });

  it("uses the seller-provided weight when given", () => {
    const c = estimateLandedCost({ priceEur: 1000, lengthCm: 200, widthCm: 150, weave: "hand_knotted", weightKg: 10, destination: "NL" });
    expect(c.weightKg).toBe(10);
    expect(c.vatRate).toBe(0.21);
  });

  it("suggests a rounded EUR price with commission", () => {
    // 600,000,000 toman / 600,000 = 1000 € → +12% = 1120
    expect(suggestEurPrice(600_000_000, 600_000, 0.12)).toBe(1120);
    expect(suggestEurPrice(1, 0, 0.12)).toBe(0);
  });
});
