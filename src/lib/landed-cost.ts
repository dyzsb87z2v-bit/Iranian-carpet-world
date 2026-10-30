import type { Weave } from "./types";

/**
 * Landed-cost estimate for a rug shipped from Iran to an EU buyer.
 *
 * Every rate here is an ESTIMATE until replaced with figures from a contracted
 * carrier and customs broker. Duty applies to the CIF value (goods + freight +
 * insurance); import VAT applies to CIF + duty.
 */

export const destinationCountries = ["DE", "FR", "NL", "AT", "BE", "IT", "ES"] as const;
export type Destination = (typeof destinationCountries)[number];

// Standard VAT rates (2026).
export const importVatRate: Record<Destination, number> = {
  DE: 0.19,
  FR: 0.2,
  NL: 0.21,
  AT: 0.2,
  BE: 0.21,
  IT: 0.22,
  ES: 0.21,
};

// Placeholder air-freight tariffs: base fee + per-kg, Iran → destination.
const freight: Record<Destination, { base: number; perKg: number }> = {
  DE: { base: 60, perKg: 7.5 },
  AT: { base: 60, perKg: 7.5 },
  NL: { base: 65, perKg: 7.8 },
  BE: { base: 65, perKg: 7.8 },
  FR: { base: 65, perKg: 8.0 },
  IT: { base: 70, perKg: 8.2 },
  ES: { base: 70, perKg: 8.4 },
};

// Rough rug weight per square metre by construction, used when the seller gave no weight.
const kgPerM2: Record<Weave, number> = {
  hand_knotted: 3.2,
  hand_woven_kilim: 1.8,
  machine_made: 2.4,
};

export interface LandedCostRates {
  insuranceRate: number;
  dutyRateHandKnotted: number;
  dutyRateMachineMade: number;
  clearanceFeeEur: number;
}

export const defaultRates: LandedCostRates = {
  insuranceRate: 0.015,
  dutyRateHandKnotted: 0.03,
  dutyRateMachineMade: 0.08,
  clearanceFeeEur: 45,
};

export interface LandedCostInput {
  priceEur: number;
  lengthCm: number;
  widthCm: number;
  weave: Weave;
  weightKg?: number | null;
  destination: Destination;
  rates?: LandedCostRates;
}

export interface LandedCost {
  goods: number;
  shipping: number;
  insurance: number;
  duty: number;
  importVat: number;
  clearance: number;
  total: number;
  weightKg: number;
  dutyRate: number;
  vatRate: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function estimateWeightKg(lengthCm: number, widthCm: number, weave: Weave): number {
  const m2 = (lengthCm / 100) * (widthCm / 100);
  // Packaging adds about 1.5 kg.
  return round2(m2 * kgPerM2[weave] + 1.5);
}

export function estimateLandedCost(input: LandedCostInput): LandedCost {
  const rates = input.rates ?? defaultRates;
  const weightKg = input.weightKg ?? estimateWeightKg(input.lengthCm, input.widthCm, input.weave);
  const tariff = freight[input.destination];

  const goods = round2(input.priceEur);
  const shipping = round2(tariff.base + tariff.perKg * weightKg);
  const insurance = round2(goods * rates.insuranceRate);
  const cif = goods + shipping + insurance;
  const dutyRate = input.weave === "machine_made" ? rates.dutyRateMachineMade : rates.dutyRateHandKnotted;
  const duty = round2(cif * dutyRate);
  const vatRate = importVatRate[input.destination];
  const importVat = round2((cif + duty) * vatRate);
  const clearance = round2(rates.clearanceFeeEur);
  const total = round2(goods + shipping + insurance + duty + importVat + clearance);

  return { goods, shipping, insurance, duty, importVat, clearance, total, weightKg, dutyRate, vatRate };
}

/** Converts a seller's toman price to a suggested EUR list price including platform commission. */
export function suggestEurPrice(priceToman: number, tomanPerEur: number, commissionRate: number): number {
  if (tomanPerEur <= 0) return 0;
  const base = priceToman / tomanPerEur;
  // Round up to a clean retail figure (nearest 10 €).
  return Math.ceil((base * (1 + commissionRate)) / 10) * 10;
}
