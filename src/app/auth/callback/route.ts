import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["magiclink", "signup", "email", "recovery", "invite", "email_change"];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/en";
  const safeNext = /^\/(en|de|fa)(\/[\w\-/]*)?$/.test(next) ? next : "/en";
  const locale = safeNext.slice(1, 3);
  const db = await supabaseServer();
  if (db && (tokenHash || code)) {
    // token_hash links work in any browser; PKCE codes only in the browser that asked for the link.
    const { error } =
      tokenHash && type && OTP_TYPES.includes(type)
        ? await db.auth.verifyOtp({ type, token_hash: tokenHash })
        : code
          ? await db.auth.exchangeCodeForSession(code)
          : { error: new Error("invalid link") };
    if (error) {
      console.error("auth callback failed", error.message);
      return NextResponse.redirect(new URL(`/${locale}/login?error=link`, url.origin));
    }
  }
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
