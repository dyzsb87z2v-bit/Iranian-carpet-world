import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { handleUpdate, type TgUpdate } from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Telegram sends the secret set via setWebhook(secret_token=…) in this header.
  if (!env.telegramSecret || request.headers.get("x-telegram-bot-api-secret-token") !== env.telegramSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = (await request.json()) as TgUpdate;
  await handleUpdate(update);
  return NextResponse.json({ ok: true });
}
