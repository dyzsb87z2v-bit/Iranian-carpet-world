"use server";

import { z } from "zod";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";

export type LoginState = { status: "idle" | "sent" | "error" | "rate" };

export async function sendMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = z.email().safeParse(form.get("email"));
  const locale = z.enum(["en", "de", "fa"]).catch("en").parse(form.get("locale"));
  const next = z.string().regex(/^\/[\w\-/]*$/).catch("/").parse(form.get("next"));
  if (!email.success) return { status: "error" };
  if (!isSupabaseConfigured()) return { status: "error" };
  // Implicit flow: the link carries the session itself, so it works in any browser or mail app.
  // PKCE would only work in the browser that requested the link.
  const db = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  const { error } = await db.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${env.siteUrl}/auth/callback?next=/${locale}${next === "/" ? "" : next}` },
  });
  if (error) {
    console.error("signInWithOtp failed", error.status, error.message);
    return { status: error.status === 429 ? "rate" : "error" };
  }
  return { status: "sent" };
}
