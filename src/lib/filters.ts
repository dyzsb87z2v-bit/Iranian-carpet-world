import type { CatalogFilters, Condition, Weave } from "./types";

const num = (v: unknown) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : undefined);
const oneOf = <T extends string>(v: unknown, opts: readonly T[]) => (opts.includes(v as T) ? (v as T) : undefined);

export const weaves = ["hand_knotted", "hand_woven_kilim", "machine_made"] as const satisfies readonly Weave[];
export const conditions = ["new", "vintage", "antique", "used"] as const satisfies readonly Condition[];
export const materials = ["wool", "silk", "wool_silk", "kork_wool"] as const;
export const sorts = ["newest", "price_asc", "price_desc", "size_desc"] as const;

export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]);
  return {
    q: str(get("q")),
    minPrice: num(get("minPrice")),
    maxPrice: num(get("maxPrice")),
    minLength: num(get("minLength")),
    maxLength: num(get("maxLength")),
    material: oneOf(get("material"), materials),
    weave: oneOf(get("weave"), weaves),
    city: str(get("city")),
    condition: oneOf(get("condition"), conditions),
    category: str(get("category")),
    sort: oneOf(get("sort"), sorts),
  };
}
