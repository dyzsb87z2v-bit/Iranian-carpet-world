"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { createListing, listingSchema } from "@/lib/listings";
import { supabaseServer } from "@/lib/supabase/server";

export type FormState = { status: "idle" | "ok" | "error"; message?: string };

const shopSchema = z.object({
  shopName: z.string().trim().min(2).max(120),
  shopNameFa: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(60),
  phone: z.string().trim().max(30).optional(),
});

export async function registerShop(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await getSession();
  const db = await supabaseServer();
  if (!session || !db) return { status: "error", message: "auth" };
  const parsed = shopSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.path.join(".") };
  const { error } = await db.from("sellers").insert({
    owner_id: session.userId,
    slug: `${slugify(parsed.data.shopName)}-${crypto.randomUUID().slice(0, 4)}`,
    shop_name: parsed.data.shopName,
    shop_name_fa: parsed.data.shopNameFa || null,
    city: parsed.data.city,
    phone: parsed.data.phone || null,
  });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/[locale]/seller", "page");
  return { status: "ok" };
}

const MAX_PHOTOS = 8;

export async function addRug(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await getSession();
  const db = await supabaseServer();
  if (!session?.seller || session.seller.status !== "approved" || !db) return { status: "error", message: "not approved" };

  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v !== ""));
  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.path.join(".") };

  try {
    const product = await createListing(db, session.seller.id, parsed.data, "web");
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, MAX_PHOTOS);
    for (const [i, file] of files.entries()) {
      if (!file.type.startsWith("image/")) continue;
      const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      const path = `${session.seller.id}/${product.id}/${i}.${ext}`;
      const { error } = await db.storage.from("product-media").upload(path, file, { contentType: file.type, upsert: true });
      if (!error) await db.from("product_media").insert({ product_id: product.id, kind: "image", storage_path: path, sort_order: i });
    }
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  revalidatePath("/[locale]/seller", "page");
  return { status: "ok" };
}
