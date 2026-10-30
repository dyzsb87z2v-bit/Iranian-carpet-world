import "server-only";
import { defaultRates, type LandedCostRates } from "./landed-cost";
import { supabaseAdmin, supabaseServer } from "./supabase/server";

export interface PlatformSettings extends LandedCostRates {
  commissionRate: number;
  tomanPerEur: number;
}

const defaults: PlatformSettings = { ...defaultRates, commissionRate: 0.12, tomanPerEur: 600_000 };

function fromRows(rows: { key: string; value: unknown }[] | null): PlatformSettings {
  const m = new Map((rows ?? []).map((r) => [r.key, Number(r.value)]));
  const pick = (k: string, d: number) => (Number.isFinite(m.get(k)) ? (m.get(k) as number) : d);
  return {
    insuranceRate: pick("insurance_rate", defaults.insuranceRate),
    dutyRateHandKnotted: pick("duty_rate_hand_knotted", defaults.dutyRateHandKnotted),
    dutyRateMachineMade: pick("duty_rate_machine_made", defaults.dutyRateMachineMade),
    clearanceFeeEur: pick("clearance_fee_eur", defaults.clearanceFeeEur),
    commissionRate: pick("commission_rate", defaults.commissionRate),
    tomanPerEur: pick("toman_per_eur", defaults.tomanPerEur),
  };
}

/** Rates visible to buyers (RLS hides commission). */
export async function getPublicRates(): Promise<LandedCostRates> {
  const db = await supabaseServer();
  if (!db) return defaultRates;
  const { data } = await db.from("settings").select("key, value");
  return fromRows(data);
}

/** All settings, for trusted server code only. */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const db = supabaseAdmin();
  if (!db) return defaults;
  const { data } = await db.from("settings").select("key, value");
  return fromRows(data);
}
