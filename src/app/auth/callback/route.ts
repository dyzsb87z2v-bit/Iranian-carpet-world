import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["magiclink", "signup", "email", "recovery", "invite", "email_change"];

function safeNext(next: string | null) {
  return next && /^\/(en|de|fa)(\/[\w\-/]*)?$/.test(next) ? next : "/en";
}

function fail(next: string, origin: string, reason: string) {
  console.error("auth callback failed", reason);
  return NextResponse.redirect(new URL(`/${next.slice(1, 3)}/login?error=link`, origin), 303);
}

// Implicit-flow links put the session in the URL fragment, which only the browser can read.
// This page posts it back here so the server can store it in cookies.
const FRAGMENT_PAGE = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>…</title>
<form method="post"><input type="hidden" name="access_token"><input type="hidden" name="refresh_token"><input type="hidden" name="error"></form>
<script>
var h=new URLSearchParams(location.hash.slice(1)),f=document.forms[0];
f.access_token.value=h.get("access_token")||"";f.refresh_token.value=h.get("refresh_token")||"";
f.error.value=h.get("error_code")||h.get("error")||(h.get("access_token")?"":"missing");
history.replaceState(null,"",location.pathname+location.search);f.submit();
</script>`;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));
  if (!tokenHash && !code) {
    return new NextResponse(FRAGMENT_PAGE, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" },
    });
  }
  const db = await supabaseServer();
  if (!db) return NextResponse.redirect(new URL(next, url.origin));
  const { error } =
    tokenHash && type && OTP_TYPES.includes(type)
      ? await db.auth.verifyOtp({ type, token_hash: tokenHash })
      : code
        ? await db.auth.exchangeCodeForSession(code)
        : { error: new Error("invalid link") };
  if (error) return fail(next, url.origin, error.message);
  return NextResponse.redirect(new URL(next, url.origin));
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  // Only accept the fragment hand-off from our own page (blocks login CSRF).
  if (request.headers.get("origin") !== url.origin) return fail(next, url.origin, "bad origin");
  const form = await request.formData();
  const accessToken = String(form.get("access_token") ?? "");
  const refreshToken = String(form.get("refresh_token") ?? "");
  const linkError = String(form.get("error") ?? "");
  if (linkError || !accessToken || !refreshToken) return fail(next, url.origin, linkError || "missing tokens");
  const db = await supabaseServer();
  if (!db) return NextResponse.redirect(new URL(next, url.origin), 303);
  const { error } = await db.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) return fail(next, url.origin, error.message);
  return NextResponse.redirect(new URL(next, url.origin), 303);
}
