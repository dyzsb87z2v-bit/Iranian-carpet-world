"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { notifySeller } from "@/lib/telegram/bot";

async function adminDb() {
  const session = await getSession();
  const db = await supabaseServer();
  if (!db || session?.role !== "admin") throw new Error("Admins only");
  return { db, adminId: session.userId };
}

const done = () => revalidatePath("/[locale]/admin", "page");

export async function publishProduct(form: FormData) {
  const { db, adminId } = await adminDb();
  const { id, priceEur } = z.object({ id: z.uuid(), priceEur: z.coerce.number().positive().max(1_000_000) }).parse(Object.fromEntries(form));
  const { data: p, error } = await db
    .from("products")
    .update({ status: "published", price_eur: priceEur, published_at: new Date().toISOString(), rejection_reason: null })
    .eq("id", id)
    .select("seller_id, slug, title_fa")
    .single();
  if (error) throw new Error(error.message);
  await db.from("product_reviews_log").insert({ product_id: id, admin_id: adminId, from_status: "pending_review", to_status: "published" });
  await notifySeller(db, p.seller_id, `فرش «${p.title_fa ?? p.slug}» تأیید و منتشر شد:\n${env.siteUrl}/en/rugs/${p.slug}`);
  done();
}

export async function rejectProduct(form: FormData) {
  const { db, adminId } = await adminDb();
  const { id, reason } = z.object({ id: z.uuid(), reason: z.string().trim().min(3).max(500) }).parse(Object.fromEntries(form));
  const { data: p, error } = await db
    .from("products")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", id)
    .select("seller_id, slug, title_fa")
    .single();
  if (error) throw new Error(error.message);
  await db.from("product_reviews_log").insert({ product_id: id, admin_id: adminId, from_status: "pending_review", to_status: "rejected", reason });
  await notifySeller(db, p.seller_id, `فرش «${p.title_fa ?? p.slug}» تأیید نشد.\nدلیل: ${reason}`);
  done();
}

export async function setSellerStatus(form: FormData) {
  const { db } = await adminDb();
  const { id, status } = z.object({ id: z.uuid(), status: z.enum(["approved", "rejected", "suspended"]) }).parse(Object.fromEntries(form));
  const { error } = await db
    .from("sellers")
    .update({ status, approved_at: status === "approved" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (status === "approved") {
    await notifySeller(db, id, "فروشگاه شما تأیید شد. حالا می‌توانید با فرستادن عکس، فرش ثبت کنید. /start");
  }
  done();
}

export async function updateRates(form: FormData) {
  const { db } = await adminDb();
  const r = z
    .object({ toman_per_eur: z.coerce.number().positive(), commission_rate: z.coerce.number().min(0).max(0.5) })
    .parse(Object.fromEntries(form));
  for (const [key, value] of Object.entries(r)) {
    await db.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
  }
  done();
}
