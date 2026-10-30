import "server-only";
import { env } from "../env";

const base = () => `https://api.telegram.org/bot${env.telegramToken}`;

export type ReplyMarkup =
  | { keyboard: { text: string; request_contact?: boolean }[][]; resize_keyboard?: boolean; one_time_keyboard?: boolean }
  | { remove_keyboard: true };

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
  if (!env.telegramToken) return null;
  const res = await fetch(`${base()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) console.error(`Telegram ${method} failed: ${json.description}`);
  return json.result ?? null;
}

export const sendMessage = (chatId: number | string, text: string, reply_markup?: ReplyMarkup) =>
  tg("sendMessage", { chat_id: chatId, text, reply_markup, parse_mode: "HTML", disable_web_page_preview: true });

/** Downloads a Telegram file (photo/video) as bytes. */
export async function downloadFile(fileId: string): Promise<{ bytes: ArrayBuffer; path: string } | null> {
  const file = await tg<{ file_path: string }>("getFile", { file_id: fileId });
  if (!file?.file_path) return null;
  const res = await fetch(`https://api.telegram.org/file/bot${env.telegramToken}/${file.file_path}`);
  if (!res.ok) return null;
  return { bytes: await res.arrayBuffer(), path: file.file_path };
}

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
