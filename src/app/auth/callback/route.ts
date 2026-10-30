import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/en";
  const safeNext = /^\/(en|de|fa)(\/[\w\-/]*)?$/.test(next) ? next : "/en";
  const db = await supabaseServer();
  if (code && db) await db.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
