import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/en";
  const safeNext = /^\/(en|de|fa)(\/[\w\-/]*)?$/.test(next) ? next : "/en";
  const db = await supabaseServer();
  if (code && db) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (error) {
      // Usually the link was opened in a different browser than the one that requested it.
      console.error("exchangeCodeForSession failed", error.message);
      const locale = safeNext.slice(1, 3);
      return NextResponse.redirect(new URL(`/${locale}/login?error=link`, url.origin));
    }
  }
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
