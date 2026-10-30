export type Weave = "hand_knotted" | "hand_woven_kilim" | "machine_made";
export type Condition = "new" | "vintage" | "antique" | "used";
export type ProductStatus = "draft" | "pending_review" | "published" | "rejected" | "archived";
export type Role = "buyer" | "seller" | "admin";

export type LocalizedText = { en: string | null; de: string | null; fa: string | null };

export interface Seller {
  id: string;
  slug: string;
  shopName: string;
  shopNameFa: string | null;
  city: string;
  isVerified: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
}

export interface Product {
  id: string;
  slug: string;
  status: ProductStatus;
  title: LocalizedText;
  description: LocalizedText;
  categorySlug: string | null;
  lengthCm: number;
  widthCm: number;
  weave: Weave;
  pileMaterial: string;
  foundationMaterial: string;
  originCity: string;
  originRegion: string | null;
  design: string | null;
  colors: string[];
  knotDensityPerDm2: number | null;
  approxAgeYears: number | null;
  condition: Condition;
  conditionNotes: string | null;
  authenticityNotes: string | null;
  hasCertificate: boolean;
  quantity: number;
  priceEur: number | null;
  weightKg: number | null;
  imageUrls: string[];
  /** Seed for the generated placeholder artwork when no photo exists yet. */
  artSeed: number;
  seller: Seller;
  publishedAt: string | null;
}

export interface CatalogFilters {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  minLength?: number;
  maxLength?: number;
  material?: string;
  weave?: Weave;
  city?: string;
  condition?: Condition;
  category?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "size_desc";
}

export const pickText = (t: LocalizedText, locale: string): string =>
  (t[locale as keyof LocalizedText] ?? t.en ?? t.de ?? t.fa ?? "").trim();
