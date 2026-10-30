import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddRugForm, RegisterShopForm } from "@/components/SellerForms";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { env, isSupabaseConfigured } from "@/lib/env";
import { formatNumber } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

export default async function SellerDashboard({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  if (!isSupabaseConfigured()) {
    return (
      <Shell title={t("seller.title")}>
        <p className="max-w-prose text-ink/75">{t("auth.demo")}</p>
      </Shell>
    );
  }

  const session = await getSession();
  if (!session) redirect({ href: { pathname: "/login", query: { next: "/seller" } }, locale });
  const telegram = env.telegramBotUsername && (
    <p className="mt-2 text-sm text-ash">
      <a className="text-lac underline-offset-4 hover:underline" href={`https://t.me/${env.telegramBotUsername}`}>{t("seller.telegramHint")}</a>
    </p>
  );

  if (!session!.seller) {
    return (
      <Shell title={t("seller.register")}>
        <p className="mb-8 max-w-prose text-ink/75">{t("seller.registerBody")}</p>
        {telegram}
        <RegisterShopForm />
      </Shell>
    );
  }

  if (session!.seller.status !== "approved") {
    return (
      <Shell title={session!.seller.shopName}>
        <p className="max-w-prose text-ink/75">{t("seller.pending")}</p>
      </Shell>
    );
  }

  const db = (await supabaseServer())!;
  const { data: rugs } = await db
    .from("products")
    .select("id, slug, status, title_fa, title_en, length_cm, width_cm, price_eur, quantity, rejection_reason, product_private(price_toman)")
    .eq("seller_id", session!.seller.id)
    .order("created_at", { ascending: false });

  return (
    <Shell title={session!.seller.shopName}>
      {telegram}
      <section className="mt-6">
        <h2 className="font-display text-2xl text-indigo">{t("seller.myRugs")}</h2>
        {!rugs?.length ? (
          <p className="mt-3 max-w-prose text-ink/75">{t("seller.none")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-start text-sm">
              <tbody className="divide-y divide-ink/10">
                {rugs.map((r: any) => (
                  <tr key={r.id}>
                    <td className="py-3 pe-4">{r.title_fa ?? r.title_en}</td>
                    <td className="py-3 pe-4 text-ash">{r.length_cm} × {r.width_cm}</td>
                    <td className="py-3 pe-4 tabular-nums">
                      {r.product_private?.price_toman != null && t("seller.toman", { value: formatNumber(r.product_private.price_toman, locale) })}
                    </td>
                    <td className="py-3 pe-4">
                      {t(`enum.status.${r.status}`)}
                      {r.status === "rejected" && r.rejection_reason && <span className="block text-xs text-lac">{r.rejection_reason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="mt-12">
        <h2 className="font-display text-2xl text-indigo">{t("seller.addRug")}</h2>
        <div className="mt-6 max-w-3xl"><AddRugForm /></div>
      </section>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-4 font-display text-4xl text-indigo">{title}</h1>
      {children}
    </div>
  );
}
