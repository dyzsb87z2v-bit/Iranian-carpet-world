import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, isSupabaseConfigured } from "../env";

/** Request-scoped client acting as the signed-in user (RLS applies). */
export async function supabaseServer() {
  if (!isSupabaseConfigured()) return null;
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component; the proxy refreshes cookies instead.
        }
      },
    },
  });
}

/** Service-role client. Bypasses RLS — use only in trusted server code (bot, admin actions). */
export function supabaseAdmin() {
  if (!env.supabaseUrl || !env.supabaseServiceKey) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } });
}
