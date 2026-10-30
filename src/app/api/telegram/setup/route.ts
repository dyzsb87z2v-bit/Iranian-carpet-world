import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { tg } from "@/lib/telegram/api";

export const runtime = "nodejs";

/**
 * Points the Telegram bot at this deployment's webhook and registers its
 * command menu. Lets the owner connect the bot without handling the token:
 * call it once with the webhook secret in `x-setup-secret`.
 */
export async function POST(request: NextRequest) {
  if (!env.telegramSecret || request.headers.get("x-setup-secret") !== env.telegramSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!env.telegramToken) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 503 });
  }

  const url = `${env.siteUrl}/api/telegram/webhook`;
  const webhook = await tg<boolean>("setWebhook", {
    url,
    secret_token: env.telegramSecret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
  await tg("setMyCommands", {
    commands: [
      { command: "new", description: "ثبت فرش جدید" },
      { command: "my", description: "فرش‌های من" },
      { command: "price", description: "تغییر قیمت" },
      { command: "stock", description: "تغییر موجودی" },
      { command: "off", description: "غیرفعال کردن فرش" },
      { command: "cancel", description: "لغو" },
    ],
  });
  const me = await tg<{ username: string }>("getMe", {});
  const info = await tg<{ url: string; pending_update_count: number; last_error_message?: string }>("getWebhookInfo", {});

  return NextResponse.json({ ok: webhook === true, bot: me?.username ?? null, webhook: info });
}
