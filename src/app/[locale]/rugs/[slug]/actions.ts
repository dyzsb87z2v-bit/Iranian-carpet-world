"use server";

import { z } from "zod";
import { destinationCountries } from "@/lib/landed-cost";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  email: z.email().max(200),
  country: z.enum(destinationCountries),
  message: z.string().trim().max(2000).optional(),
});

export type InquiryState = { status: "idle" | "sent" | "error" };

export async function submitInquiry(_prev: InquiryState, form: FormData): Promise<InquiryState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error" };
  const db = await supabaseServer();
  if (!db) return { status: "sent" }; // demo mode: nothing to store
  const { data: { user } } = await db.auth.getUser();
  const { error } = await db.from("inquiries").insert({
    product_id: parsed.data.productId,
    buyer_id: user?.id ?? null,
    name: parsed.data.name,
    email: parsed.data.email,
    country_code: parsed.data.country,
    message: parsed.data.message || null,
  });
  return { status: error ? "error" : "sent" };
}
