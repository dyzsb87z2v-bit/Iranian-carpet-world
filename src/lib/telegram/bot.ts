import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { suggestListing, type ListingSuggestion } from "../ai";
import { env } from "../env";
import { formatNumber, slugify } from "../format";
import { createListing } from "../listings";
import { supabaseAdmin } from "../supabase/server";
import type { Condition, Weave } from "../types";
import { downloadFile, escapeHtml, sendMessage, type ReplyMarkup } from "./api";
import { parseCommand, parseInt0, parseSize, parseToman } from "./parse";

// ───────────── Telegram update types (subset we use)
interface TgMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; username?: string; first_name?: string };
  text?: string;
  caption?: string;
  photo?: { file_id: string; file_size?: number; width: number; height: number }[];
  video?: { file_id: string };
  contact?: { phone_number: string };
}
export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

type State =
  | "idle"
  | "reg_shop" | "reg_city" | "reg_phone"
  | "photos"
  | "q_title" | "q_city" | "q_size" | "q_weave" | "q_pile" | "q_age" | "q_condition" | "q_price"
  | "confirm";

interface Draft {
  photos?: string[];
  videos?: string[];
  titleFa?: string;
  originCity?: string;
  lengthCm?: number;
  widthCm?: number;
  weave?: Weave;
  pileMaterial?: string;
  approxAgeYears?: number;
  condition?: Condition;
  priceToman?: number;
  notesFa?: string;
  suggestion?: ListingSuggestion;
  model?: string | null;
}
interface SessionData {
  shopName?: string;
  city?: string;
  draft?: Draft;
  myList?: string[];
}
interface Session { state: State; data: SessionData }

// ───────────── Persian copy and keyboards
const L = {
  welcome: "به ربات فروشندگان «دنیای فرش ایران» خوش آمدید.\nبرای ثبت فروشگاه، نام فروشگاهتان را بنویسید.",
  askCity: "فروشگاه در کدام شهر است؟",
  askPhone: "شماره تماس را با دکمه زیر بفرستید یا بنویسید.",
  registered: "فروشگاه ثبت شد و در انتظار تأیید است. پس از تأیید همین‌جا خبر می‌دهیم.",
  pending: "فروشگاه شما هنوز در انتظار تأیید است. پس از تأیید می‌توانید فرش ثبت کنید.",
  blocked: "حساب فروشگاه شما فعال نیست. برای پیگیری با پشتیبانی تماس بگیرید.",
  menu:
    "چه کاری انجام دهیم؟\n\n" +
    "📷 برای ثبت فرش جدید، عکس‌های فرش را بفرستید یا /new\n" +
    "/my فهرست فرش‌های من\n" +
    "/price شماره قیمت  (مثال: /price 2 90 میلیون)\n" +
    "/stock شماره تعداد  (مثال: /stock 2 0)\n" +
    "/off شماره  غیرفعال‌کردن فرش\n" +
    "/cancel لغو کار فعلی",
  sendPhotos: "عکس‌های فرش را بفرستید (روبه‌رو، پشت فرش، نزدیک از گره‌ها، گوشه‌ها). ویدئو هم قبول است.\nوقتی تمام شد «تمام» را بزنید.",
  photoTips: "نکته: عکس در نور روز، کل فرش در کادر، بدون فیلتر.",
  gotPhoto: (n: number) => `عکس ${n} دریافت شد. عکس بعدی را بفرستید یا «تمام» را بزنید.`,
  needPhoto: "حداقل یک عکس لازم است.",
  qTitle: "نام فرش چیست؟ (مثال: تبریز ماهی ترنج‌دار)",
  qCity: "شهر یا منطقه بافت؟ (مثال: کاشان)",
  qSize: "ابعاد فرش به سانتی‌متر؟ (مثال: 300 در 200)",
  badSize: "ابعاد را این‌طور بنویسید: 300 در 200",
  qWeave: "نوع بافت؟",
  qPile: "جنس پرز؟",
  qAge: "سن تقریبی فرش به سال؟ (برای نو بنویسید 0)",
  badNumber: "لطفاً فقط عدد بنویسید.",
  qCondition: "وضعیت فرش؟",
  qPrice: "قیمت فروش شما به تومان؟ (مثال: 120 میلیون)\nاین قیمت فقط برای شما و مدیر قابل مشاهده است.",
  badPrice: "قیمت را این‌طور بنویسید: 120 میلیون",
  thinking: "در حال آماده‌سازی متن انگلیسی و آلمانی…",
  confirmQ: "اگر درست است «ارسال برای بررسی» را بزنید.",
  sent: (slug: string) => `فرش برای بررسی ارسال شد. پس از تأیید مدیر در سایت منتشر می‌شود.\nکد: ${slug}`,
  cancelled: "لغو شد.",
  noList: "هنوز فرشی ثبت نکرده‌اید.",
  listFirst: "اول /my را بزنید تا شماره فرش‌ها را ببینید.",
  notFound: "فرشی با این شماره پیدا نشد. /my را بزنید.",
  priceUpdated: "قیمت به‌روز شد. فرش برای تعیین قیمت یورو دوباره به صف بررسی رفت.",
  stockUpdated: "موجودی به‌روز شد.",
  offDone: "فرش غیرفعال شد و در سایت نمایش داده نمی‌شود.",
  usagePrice: "مثال: /price 2 90 میلیون",
  usageStock: "مثال: /stock 2 1",
  usageOff: "مثال: /off 2",
  error: "خطایی رخ داد. دوباره امتحان کنید یا /cancel را بزنید.",
};

const kb = (rows: string[][], oneTime = true): ReplyMarkup => ({
  keyboard: rows.map((r) => r.map((text) => ({ text }))),
  resize_keyboard: true,
  one_time_keyboard: oneTime,
});
const noKb: ReplyMarkup = { remove_keyboard: true };

const DONE = "تمام";
const SUBMIT = "ارسال برای بررسی";
const CANCEL = "لغو";

const weaveOptions: Record<string, Weave> = { "دستباف": "hand_knotted", "گلیم": "hand_woven_kilim", "ماشینی": "machine_made" };
const pileOptions: Record<string, string> = { "پشم": "wool", "ابریشم": "silk", "پشم و ابریشم": "wool_silk", "کرک": "kork_wool" };
const conditionOptions: Record<string, Condition> = { "نو": "new", "کهنه": "vintage", "عتیقه": "antique", "دست‌دوم": "used" };
const statusFa: Record<string, string> = {
  draft: "پیش‌نویس", pending_review: "در انتظار بررسی", published: "منتشرشده", rejected: "ردشده", archived: "غیرفعال",
};

// ───────────── persistence
async function loadSession(db: SupabaseClient, chatId: number): Promise<Session> {
  const { data } = await db.from("telegram_sessions").select("state, data").eq("chat_id", chatId).maybeSingle();
  return data ? { state: data.state as State, data: (data.data ?? {}) as SessionData } : { state: "idle", data: {} };
}
async function saveSession(db: SupabaseClient, chatId: number, s: Session) {
  await db.from("telegram_sessions").upsert({ chat_id: chatId, state: s.state, data: s.data, updated_at: new Date().toISOString() });
}

// ───────────── main handler
export async function handleUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message;
  if (!msg || msg.chat.type !== "private") return;
  const db = supabaseAdmin();
  const chatId = msg.chat.id;
  if (!db) {
    await sendMessage(chatId, "سرویس هنوز به دیتابیس وصل نیست.");
    return;
  }

  const session = await loadSession(db, chatId);
  try {
    await route(db, msg, session);
  } catch (e) {
    console.error("bot error", e);
    await sendMessage(chatId, L.error);
  }
  await saveSession(db, chatId, session);
}

async function route(db: SupabaseClient, msg: TgMessage, s: Session) {
  const chatId = msg.chat.id;
  const text = (msg.text ?? "").trim();
  const command = parseCommand(text);
  const say = (t: string, m?: ReplyMarkup) => sendMessage(chatId, t, m);

  if (command?.cmd === "cancel" || text === CANCEL) {
    s.state = "idle";
    s.data.draft = undefined;
    return say(L.cancelled, noKb);
  }

  const { data: seller } = await db.from("sellers").select("id, status, shop_name").eq("telegram_chat_id", chatId).maybeSingle();

  // ── registration
  if (!seller) {
    switch (s.state) {
      case "reg_shop":
        if (!text) return say(L.welcome);
        s.data.shopName = text.slice(0, 120);
        s.state = "reg_city";
        return say(L.askCity);
      case "reg_city":
        if (!text) return say(L.askCity);
        s.data.city = text.slice(0, 60);
        s.state = "reg_phone";
        return say(L.askPhone, { keyboard: [[{ text: "ارسال شماره", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true });
      case "reg_phone": {
        const phone = msg.contact?.phone_number ?? text;
        if (!phone) return say(L.askPhone);
        const shopName = s.data.shopName ?? "Shop";
        await db.from("sellers").insert({
          slug: `${slugify(shopName) || "shop"}-${crypto.randomUUID().slice(0, 4)}`,
          shop_name: shopName,
          shop_name_fa: shopName,
          city: s.data.city ?? "",
          phone: phone.slice(0, 30),
          telegram_chat_id: chatId,
          telegram_username: msg.from?.username ?? null,
        });
        await notifyAdmin(`فروشگاه جدید در تلگرام ثبت شد: ${escapeHtml(shopName)}، ${escapeHtml(s.data.city ?? "")}`);
        s.state = "idle";
        s.data = {};
        return say(L.registered, noKb);
      }
      default:
        s.state = "reg_shop";
        return say(L.welcome, noKb);
    }
  }

  if (seller.status === "pending") return say(L.pending);
  if (seller.status !== "approved") return say(L.blocked);

  // ── commands available any time
  if (command) {
    switch (command.cmd) {
      case "start":
      case "help":
        s.state = "idle";
        return say(`${escapeHtml(seller.shop_name)}\n\n${L.menu}`, noKb);
      case "new":
        s.state = "photos";
        s.data.draft = { photos: [], videos: [] };
        return say(`${L.sendPhotos}\n${L.photoTips}`, kb([[DONE], [CANCEL]], false));
      case "my":
        return listMine(db, seller.id, s, say);
      case "price":
      case "stock":
      case "off":
        return manage(db, seller.id, command, s, say);
    }
  }

  // A photo while idle starts a new listing.
  if (s.state === "idle" && (msg.photo || msg.video)) {
    s.state = "photos";
    s.data.draft = { photos: [], videos: [] };
  }

  const d = (s.data.draft ??= {});
  switch (s.state) {
    case "photos": {
      if (msg.photo?.length) {
        // Telegram sends several sizes; the last is the largest.
        (d.photos ??= []).push(msg.photo[msg.photo.length - 1].file_id);
        if (msg.caption) d.notesFa = [d.notesFa, msg.caption].filter(Boolean).join("\n");
        return say(L.gotPhoto(d.photos.length), kb([[DONE], [CANCEL]], false));
      }
      if (msg.video) {
        (d.videos ??= []).push(msg.video.file_id);
        return say(L.gotPhoto((d.photos?.length ?? 0) + d.videos.length), kb([[DONE], [CANCEL]], false));
      }
      if (text === DONE) {
        if (!d.photos?.length) return say(L.needPhoto);
        s.state = "q_title";
        return say(L.qTitle, noKb);
      }
      return say(L.sendPhotos, kb([[DONE], [CANCEL]], false));
    }
    case "q_title":
      if (!text) return say(L.qTitle);
      d.titleFa = text.slice(0, 120);
      s.state = "q_city";
      return say(L.qCity);
    case "q_city":
      if (!text) return say(L.qCity);
      d.originCity = text.slice(0, 60);
      s.state = "q_size";
      return say(L.qSize);
    case "q_size": {
      const size = parseSize(text);
      if (!size) return say(L.badSize);
      Object.assign(d, size);
      s.state = "q_weave";
      return say(L.qWeave, kb([Object.keys(weaveOptions)]));
    }
    case "q_weave":
      if (!weaveOptions[text]) return say(L.qWeave, kb([Object.keys(weaveOptions)]));
      d.weave = weaveOptions[text];
      s.state = "q_pile";
      return say(L.qPile, kb([Object.keys(pileOptions).slice(0, 2), Object.keys(pileOptions).slice(2)]));
    case "q_pile":
      if (!pileOptions[text]) return say(L.qPile, kb([Object.keys(pileOptions)]));
      d.pileMaterial = pileOptions[text];
      s.state = "q_age";
      return say(L.qAge, noKb);
    case "q_age": {
      const age = parseInt0(text, 300);
      if (age === null) return say(L.badNumber);
      d.approxAgeYears = age;
      s.state = "q_condition";
      return say(L.qCondition, kb([Object.keys(conditionOptions)]));
    }
    case "q_condition":
      if (!conditionOptions[text]) return say(L.qCondition, kb([Object.keys(conditionOptions)]));
      d.condition = conditionOptions[text];
      s.state = "q_price";
      return say(L.qPrice, noKb);
    case "q_price": {
      const price = parseToman(text);
      if (!price) return say(L.badPrice);
      d.priceToman = price;
      await say(L.thinking);
      const photo = d.photos?.[0] ? await downloadFile(d.photos[0]) : null;
      const { suggestion, model } = await suggestListing(
        {
          titleFa: d.titleFa!, originCity: d.originCity!, lengthCm: d.lengthCm!, widthCm: d.widthCm!, weave: d.weave!,
          pileMaterial: d.pileMaterial, approxAgeYears: d.approxAgeYears, condition: d.condition!, notesFa: d.notesFa,
        },
        photo ? { bytes: photo.bytes, mediaType: "image/jpeg" } : undefined,
      );
      d.suggestion = suggestion;
      d.model = model;
      s.state = "confirm";
      return say(summary(d), kb([[SUBMIT], [CANCEL]]));
    }
    case "confirm": {
      if (text !== SUBMIT) return say(L.confirmQ, kb([[SUBMIT], [CANCEL]]));
      const slug = await submitDraft(db, seller.id, d);
      s.state = "idle";
      s.data.draft = undefined;
      await notifyAdmin(`فرش جدید برای بررسی از ${escapeHtml(seller.shop_name)}:\n${env.siteUrl}/fa/admin`);
      return say(L.sent(slug), noKb);
    }
    default:
      return say(`${escapeHtml(seller.shop_name)}\n\n${L.menu}`, noKb);
  }
}

function summary(d: Draft): string {
  const sug = d.suggestion;
  const lines = [
    `<b>${escapeHtml(d.titleFa ?? "")}</b>`,
    `شهر: ${escapeHtml(d.originCity ?? "")}`,
    `ابعاد: ${d.lengthCm} × ${d.widthCm} سانتی‌متر`,
    `نوع بافت: ${Object.keys(weaveOptions).find((k) => weaveOptions[k] === d.weave)}`,
    `پرز: ${Object.keys(pileOptions).find((k) => pileOptions[k] === d.pileMaterial)}`,
    `سن: ${d.approxAgeYears} سال`,
    `وضعیت: ${Object.keys(conditionOptions).find((k) => conditionOptions[k] === d.condition)}`,
    `قیمت: ${formatNumber(d.priceToman ?? 0, "fa")} تومان`,
    `عکس: ${d.photos?.length ?? 0}`,
  ];
  if (sug) {
    lines.push("", `<b>EN:</b> ${escapeHtml(sug.titleEn)}`, escapeHtml(sug.descriptionEn), "", `<b>DE:</b> ${escapeHtml(sug.titleDe)}`);
    if (sug.followUpQuestionsFa.length) {
      lines.push("", "<b>چند سؤال برای کامل‌تر شدن آگهی</b> (می‌توانید بعداً به مدیر جواب دهید):");
      sug.followUpQuestionsFa.forEach((q) => lines.push(`• ${escapeHtml(q)}`));
    }
  }
  lines.push("", L.confirmQ);
  return lines.join("\n");
}

async function submitDraft(db: SupabaseClient, sellerId: string, d: Draft): Promise<string> {
  const sug = d.suggestion;
  const product = await createListing(
    db,
    sellerId,
    {
      titleFa: d.titleFa!, titleEn: sug?.titleEn, titleDe: sug?.titleDe,
      descriptionFa: sug?.descriptionFa || d.notesFa, descriptionEn: sug?.descriptionEn, descriptionDe: sug?.descriptionDe,
      lengthCm: d.lengthCm!, widthCm: d.widthCm!, weave: d.weave!, pileMaterial: d.pileMaterial,
      originCity: d.originCity!, approxAgeYears: d.approxAgeYears, condition: d.condition!, priceToman: d.priceToman!, quantity: 1,
    },
    "telegram",
  );

  if (sug) {
    const { data: cat } = await db.from("categories").select("id").eq("slug", sug.suggestedCategory).maybeSingle();
    if (cat) await db.from("products").update({ category_id: cat.id }).eq("id", product.id);
    await db.from("ai_suggestions").insert({ product_id: product.id, model: d.model ?? "fallback", input: { ...d, suggestion: undefined }, output: sug });
  }

  // Copy photos from Telegram into storage so the site never depends on Telegram URLs.
  for (const [i, fileId] of (d.photos ?? []).entries()) {
    const file = await downloadFile(fileId);
    let storagePath: string | null = null;
    if (file) {
      storagePath = `${sellerId}/${product.id}/${i}.jpg`;
      const { error } = await db.storage.from("product-media").upload(storagePath, file.bytes, { contentType: "image/jpeg", upsert: true });
      if (error) storagePath = null;
    }
    await db.from("product_media").insert({ product_id: product.id, kind: "image", storage_path: storagePath, telegram_file_id: fileId, sort_order: i });
  }
  for (const [i, fileId] of (d.videos ?? []).entries()) {
    await db.from("product_media").insert({ product_id: product.id, kind: "video", telegram_file_id: fileId, sort_order: 100 + i });
  }
  return product.slug;
}

async function listMine(db: SupabaseClient, sellerId: string, s: Session, say: (t: string) => Promise<unknown>) {
  const { data } = await db
    .from("products")
    .select("id, title_fa, length_cm, width_cm, status, quantity, product_private(price_toman)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (!data?.length) return say(L.noList);
  s.data.myList = data.map((p) => p.id);
  const rows = data.map((p: any, i) => {
    const price = p.product_private?.price_toman;
    return `${i + 1}. ${escapeHtml(p.title_fa ?? "")} (${p.length_cm}×${p.width_cm}) · ${statusFa[p.status]} · موجودی ${p.quantity}${price ? ` · ${formatNumber(price, "fa")} تومان` : ""}`;
  });
  return say(rows.join("\n"));
}

async function manage(
  db: SupabaseClient,
  sellerId: string,
  command: { cmd: string; args: string[] },
  s: Session,
  say: (t: string) => Promise<unknown>,
) {
  const usage = { price: L.usagePrice, stock: L.usageStock, off: L.usageOff }[command.cmd as "price" | "stock" | "off"];
  if (!s.data.myList?.length) return say(L.listFirst);
  const index = parseInt0(command.args[0] ?? "", 100);
  if (!index) return say(usage);
  const productId = s.data.myList[index - 1];
  if (!productId) return say(L.notFound);
  // The service client bypasses RLS, so every query below also filters by seller_id.

  if (command.cmd === "price") {
    const price = parseToman(command.args.slice(1).join(" "));
    if (!price) return say(usage);
    const { data: p } = await db.from("products").select("id").eq("id", productId).eq("seller_id", sellerId).maybeSingle();
    if (!p) return say(L.notFound);
    await db.from("product_private").upsert({ product_id: productId, price_toman: price });
    await db.from("products").update({ status: "pending_review", price_eur: null }).eq("id", productId).eq("seller_id", sellerId);
    await notifyAdmin(`تغییر قیمت فرش، نیاز به قیمت‌گذاری یورو:\n${env.siteUrl}/fa/admin`);
    return say(L.priceUpdated);
  }
  if (command.cmd === "stock") {
    const qty = parseInt0(command.args[1] ?? "", 100);
    if (qty === null) return say(usage);
    await db.from("products").update({ quantity: qty }).eq("id", productId).eq("seller_id", sellerId);
    return say(L.stockUpdated);
  }
  await db.from("products").update({ status: "archived" }).eq("id", productId).eq("seller_id", sellerId);
  return say(L.offDone);
}

export async function notifyAdmin(text: string) {
  if (env.telegramAdminChatId) await sendMessage(env.telegramAdminChatId, text);
}

/** Tells a seller on Telegram about a review decision. */
export async function notifySeller(db: SupabaseClient, sellerId: string, text: string) {
  const { data } = await db.from("sellers").select("telegram_chat_id").eq("id", sellerId).maybeSingle();
  if (data?.telegram_chat_id) await sendMessage(data.telegram_chat_id, text);
}
