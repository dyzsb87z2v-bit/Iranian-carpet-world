"use server";

import { z } from "zod";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error" };

export async function sendMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = z.email().safeParse(form.get("email"));
  const locale = z.enum(["en", "de", "fa"]).catch("en").parse(form.get("locale"));
  const next = z.string().regex(/^\/[\w\-/]*$/).catch("/").parse(form.get("next"));
  if (!email.success) return { status: "error" };
  const db = await supabaseServer();
  if (!db) return { status: "error" };
  const { error } = await db.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${env.siteUrl}/auth/callback?next=/${locale}${next === "/" ? "" : next}` },
  });
  return { status: error ? "error" : "sent" };
}
