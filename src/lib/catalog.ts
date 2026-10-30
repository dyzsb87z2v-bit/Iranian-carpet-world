import "server-only";
import { demoProducts } from "./demo-data";
import { env } from "./env";
import { supabaseServer } from "./supabase/server";
import type { CatalogFilters, Product } from "./types";

// Columns buyers may read. Never select from product_private here.
export const PRODUCT_COLUMNS = `
  id, slug, status, title_en, title_de, title_fa, description_en, description_de, description_fa,
  length_cm, width_cm, weave, pile_material, foundation_material, origin_city, origin_region, design,
  colors, knot_density_per_dm2, approx_age_years, condition, condition_notes, authenticity_notes,
  has_certificate, quantity, price_eur, weight_kg, published_at,
  category:categories(slug),
  seller:sellers(id, slug, shop_name, shop_name_fa, city, is_verified, status),
  media:product_media(storage_path, kind, sort_order)
`;

type Row = Record<string, any>;

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function mediaUrl(path: string) {
  return `${env.supabaseUrl}/storage/v1/object/public/product-media/${path}`;
}

export function mapProduct(r: Row): Product {
  const media = ((r.media ?? []) as Row[])
    .filter((m) => m.kind === "image" && m.storage_path)
    .sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: r.id,
    slug: r.slug,
    status: r.status,
    title: { en: r.title_en, de: r.title_de, fa: r.title_fa },
    description: { en: r.description_en, de: r.description_de, fa: r.description_fa },
    categorySlug: r.category?.slug ?? null,
    lengthCm: r.length_cm ?? 0,
    widthCm: r.width_cm ?? 0,
    weave: r.weave ?? "hand_knotted",
    pileMaterial: r.pile_material ?? "",
    foundationMaterial: r.foundation_material ?? "",
    originCity: r.origin_city ?? "",
    originRegion: r.origin_region,
    design: r.design,
    colors: r.colors ?? [],
    knotDensityPerDm2: r.knot_density_per_dm2,
    approxAgeYears: r.approx_age_years,
    condition: r.condition ?? "new",
    conditionNotes: r.condition_notes,
    authenticityNotes: r.authenticity_notes,
    hasCertificate: r.has_certificate ?? false,
    quantity: r.quantity ?? 0,
    priceEur: r.price_eur === null || r.price_eur === undefined ? null : Number(r.price_eur),
    weightKg: r.weight_kg === null || r.weight_kg === undefined ? null : Number(r.weight_kg),
    imageUrls: media.map((m) => mediaUrl(m.storage_path)),
    artSeed: hash(r.id),
    seller: {
      id: r.seller?.id,
      slug: r.seller?.slug,
      shopName: r.seller?.shop_name,
      shopNameFa: r.seller?.shop_name_fa,
      city: r.seller?.city,
      isVerified: r.seller?.is_verified ?? false,
      status: r.seller?.status,
    },
    publishedAt: r.published_at,
  };
}

export function applyFilters(list: Product[], f: CatalogFilters): Product[] {
  const q = f.q?.trim().toLowerCase();
  const out = list.filter((p) => {
    if (p.status !== "published" || p.quantity < 1) return false;
    if (q) {
      const hay = [p.title.en, p.title.de, p.title.fa, p.originCity, p.design, p.seller.shopName].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.minPrice !== undefined && (p.priceEur ?? 0) < f.minPrice) return false;
    if (f.maxPrice !== undefined && (p.priceEur ?? 0) > f.maxPrice) return false;
    if (f.minLength !== undefined && p.lengthCm < f.minLength) return false;
    if (f.maxLength !== undefined && p.lengthCm > f.maxLength) return false;
    if (f.material && !p.pileMaterial.includes(f.material)) return false;
    if (f.weave && p.weave !== f.weave) return false;
    if (f.city && p.originCity.toLowerCase() !== f.city.toLowerCase()) return false;
    if (f.condition && p.condition !== f.condition) return false;
    if (f.category && p.categorySlug !== f.category) return false;
    return true;
  });
  const by: Record<NonNullable<CatalogFilters["sort"]>, (a: Product, b: Product) => number> = {
    newest: (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    price_asc: (a, b) => (a.priceEur ?? 0) - (b.priceEur ?? 0),
    price_desc: (a, b) => (b.priceEur ?? 0) - (a.priceEur ?? 0),
    size_desc: (a, b) => b.lengthCm * b.widthCm - a.lengthCm * a.widthCm,
  };
  return out.sort(by[f.sort ?? "newest"]);
}

export async function listProducts(filters: CatalogFilters = {}): Promise<Product[]> {
  const db = await supabaseServer();
  if (!db) return applyFilters(demoProducts, filters);

  let query = db.from("products").select(PRODUCT_COLUMNS).eq("status", "published").gt("quantity", 0).limit(200);
  if (filters.minPrice !== undefined) query = query.gte("price_eur", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price_eur", filters.maxPrice);
  if (filters.weave) query = query.eq("weave", filters.weave);
  if (filters.city) query = query.ilike("origin_city", filters.city);
  if (filters.condition) query = query.eq("condition", filters.condition);
  const { data, error } = await query;
  if (error) throw new Error(`Catalog query failed: ${error.message}`);
  // Text search, material and category are applied in memory; fine for MVP volumes.
  return applyFilters((data ?? []).map(mapProduct), filters);
}

export async function getProduct(slug: string): Promise<Product | null> {
  const db = await supabaseServer();
  if (!db) return demoProducts.find((p) => p.slug === slug) ?? null;
  const { data } = await db.from("products").select(PRODUCT_COLUMNS).eq("slug", slug).maybeSingle();
  return data ? mapProduct(data) : null;
}

export async function listOriginCities(): Promise<string[]> {
  const all = await listProducts();
  return [...new Set(all.map((p) => p.originCity).filter(Boolean))].sort();
}
