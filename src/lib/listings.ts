import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { slugify } from "./format";

export const listingSchema = z.object({
  titleFa: z.string().trim().min(2).max(120),
  titleEn: z.string().trim().max(160).optional(),
  titleDe: z.string().trim().max(160).optional(),
  descriptionFa: z.string().trim().max(4000).optional(),
  descriptionEn: z.string().trim().max(4000).optional(),
  descriptionDe: z.string().trim().max(4000).optional(),
  lengthCm: z.coerce.number().int().min(20).max(2000),
  widthCm: z.coerce.number().int().min(20).max(2000),
  weave: z.enum(["hand_knotted", "hand_woven_kilim", "machine_made"]),
  pileMaterial: z.string().trim().max(40).optional(),
  foundationMaterial: z.string().trim().max(40).optional(),
  originCity: z.string().trim().min(2).max(60),
  design: z.string().trim().max(80).optional(),
  approxAgeYears: z.coerce.number().int().min(0).max(300).optional(),
  condition: z.enum(["new", "vintage", "antique", "used"]),
  priceToman: z.coerce.number().int().min(0).max(1e13),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
});

export type ListingInput = z.infer<typeof listingSchema>;

/**
 * Creates a product in "pending_review" plus its private toman price.
 * Works with a user client (RLS enforces ownership) or the service client (bot).
 */
export async function createListing(
  db: SupabaseClient,
  sellerId: string,
  input: ListingInput,
  source: "web" | "telegram",
): Promise<{ id: string; slug: string }> {
  const slug = `${slugify(input.titleEn || input.originCity || "rug")}-${input.lengthCm}x${input.widthCm}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await db
    .from("products")
    .insert({
      seller_id: sellerId,
      slug,
      status: "pending_review",
      source,
      title_fa: input.titleFa,
      title_en: input.titleEn ?? null,
      title_de: input.titleDe ?? null,
      description_fa: input.descriptionFa ?? null,
      description_en: input.descriptionEn ?? null,
      description_de: input.descriptionDe ?? null,
      length_cm: input.lengthCm,
      width_cm: input.widthCm,
      weave: input.weave,
      pile_material: input.pileMaterial ?? null,
      foundation_material: input.foundationMaterial ?? null,
      origin_city: input.originCity,
      design: input.design ?? null,
      approx_age_years: input.approxAgeYears ?? null,
      condition: input.condition,
      quantity: input.quantity,
    })
    .select("id, slug")
    .single();
  if (error || !data) throw new Error(`Could not create listing: ${error?.message}`);
  const { error: privErr } = await db.from("product_private").insert({ product_id: data.id, price_toman: input.priceToman });
  if (privErr) throw new Error(`Could not store private price: ${privErr.message}`);
  return data;
}
