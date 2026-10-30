import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "../env";

/** Keeps the Supabase auth cookie fresh on every page request. */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  if (!isSupabaseConfigured()) return response;
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  await supabase.auth.getUser();
  return response;
}
