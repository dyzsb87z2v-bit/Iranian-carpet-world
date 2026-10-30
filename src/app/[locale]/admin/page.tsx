import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { mediaUrl } from "@/lib/catalog";
import { isSupabaseConfigured } from "@/lib/env";
import { formatNumber } from "@/lib/format";
import { suggestEurPrice } from "@/lib/landed-cost";
import { supabaseServer } from "@/lib/supabase/server";
import { publishProduct, rejectProduct, setSellerStatus, updateRates } from "./actions";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  if (!isSupabaseConfigured()) {
    return <Shell title={t("admin.title")}><p className="text-ink/75">{t("auth.demo")}</p></Shell>;
  }
  const session = await getSession();
  if (!session) redirect({ href: { pathname: "/login", query: { next: "/admin" } }, locale });
  if (session!.role !== "admin") return <Shell title={t("admin.title")}><p>{t("admin.notAllowed")}</p></Shell>;

  const db = (await supabaseServer())!;
  const [{ data: queue }, { data: sellers }, { data: settings }] = await Promise.all([
    db.from("products")
      .select("id, slug, title_fa, title_en, title_de, description_en, length_cm, width_cm, weave, origin_city, pile_material, approx_age_years, condition, source, created_at, seller:sellers(shop_name, city), product_private(price_toman), media:product_media(storage_path, kind, sort_order)")
      .eq("status", "pending_review")
      .order("created_at"),
    db.from("sellers").select("id, shop_name, shop_name_fa, city, phone, telegram_username, created_at").eq("status", "pending").order("created_at"),
    db.from("settings").select("key, value"),
  ]);
  const rate = Number(settings?.find((s) => s.key === "toman_per_eur")?.value ?? 600000);
  const commission = Number(settings?.find((s) => s.key === "commission_rate")?.value ?? 0.12);

  return (
    <Shell title={t("admin.title")}>
      <section>
        <h2 className="font-display text-2xl text-indigo">{t("admin.queue")}</h2>
        {!queue?.length && <p className="mt-3 text-ink/75">{t("admin.queueEmpty")}</p>}
        <ul className="mt-6 space-y-10">
          {queue?.map((p: any) => {
            const toman = p.product_private?.price_toman ?? 0;
            const suggested = suggestEurPrice(toman, rate, commission);
            const photos = (p.media ?? []).filter((m: any) => m.kind === "image" && m.storage_path).sort((a: any, b: any) => a.sort_order - b.sort_order);
            return (
              <li key={p.id} className="grid gap-6 border-t border-ink/15 pt-6 md:grid-cols-[12rem_1fr]">
                <div className="grid grid-cols-3 gap-2 md:grid-cols-2">
                  {photos.slice(0, 4).map((m: any) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={m.storage_path} src={mediaUrl(m.storage_path)} alt="" className="aspect-square w-full bg-wool-deep object-cover" />
                  ))}
                </div>
                <div>
                  <p className="text-lg font-medium" dir="auto">{p.title_fa} {p.title_en && <span className="text-ash">· {p.title_en}</span>}</p>
                  <p className="text-sm text-ash">
                    {p.seller?.shop_name}, {p.seller?.city} · {p.length_cm} × {p.width_cm} cm · {t(`enum.weave.${p.weave}`)} · {p.origin_city}
                    {p.approx_age_years != null && ` · ${p.approx_age_years}y`} · {t(`enum.condition.${p.condition}`)} · {p.source}
                  </p>
                  {p.description_en && <p className="mt-2 max-w-prose text-sm">{p.description_en}</p>}
                  <p className="mt-2 text-sm">{t("admin.suggested", { eur: formatNumber(suggested, locale), toman: formatNumber(toman, locale) })}</p>
                  <div className="mt-4 flex flex-wrap items-end gap-6">
                    <form action={publishProduct} className="flex items-end gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <div>
                        <label className="label" htmlFor={`price-${p.id}`}>{t("admin.priceEur")}</label>
                        <input id={`price-${p.id}`} name="priceEur" type="number" min={1} step="1" defaultValue={suggested || ""} required className="field w-36" />
                      </div>
                      <button className="btn">{t("admin.publish")}</button>
                    </form>
                    <form action={rejectProduct} className="flex items-end gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <div>
                        <label className="label" htmlFor={`reason-${p.id}`}>{t("admin.reason")}</label>
                        <input id={`reason-${p.id}`} name="reason" required minLength={3} className="field w-64" />
                      </div>
                      <button className="btn-ghost">{t("admin.reject")}</button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl text-indigo">{t("admin.sellers")}</h2>
        {!sellers?.length && <p className="mt-3 text-ink/75">{t("admin.sellersEmpty")}</p>}
        <ul className="mt-4 divide-y divide-ink/10">
          {sellers?.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{s.shop_name} {s.shop_name_fa && s.shop_name_fa !== s.shop_name && <span dir="rtl">· {s.shop_name_fa}</span>}</p>
                <p className="text-sm text-ash">{s.city} · {s.phone}{s.telegram_username && ` · @${s.telegram_username}`}</p>
              </div>
              <div className="flex gap-2">
                <form action={setSellerStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="approved" /><button className="btn">{t("admin.approveSeller")}</button></form>
                <form action={setSellerStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="rejected" /><button className="btn-ghost">{t("admin.rejectSeller")}</button></form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl text-indigo">{t("admin.settings")}</h2>
        <form action={updateRates} className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="label" htmlFor="toman_per_eur">Toman / €</label>
            <input id="toman_per_eur" name="toman_per_eur" type="number" min={1} defaultValue={rate} className="field w-44" />
          </div>
          <div>
            <label className="label" htmlFor="commission_rate">Commission (0–0.5)</label>
            <input id="commission_rate" name="commission_rate" type="number" step="0.005" min={0} max={0.5} defaultValue={commission} className="field w-36" />
          </div>
          <button className="btn-ghost">Save</button>
        </form>
      </section>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-display text-4xl text-indigo">{title}</h1>
      {children}
    </div>
  );
}
