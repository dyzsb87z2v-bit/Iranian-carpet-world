import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard } from "@/components/ProductCard";
import { RugArt } from "@/components/RugArt";
import { Link } from "@/i18n/navigation";
import { listProducts } from "@/lib/catalog";
import { env } from "@/lib/env";
import { pickText } from "@/lib/types";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const products = await listProducts({ sort: "newest" });
  const hero = products.find((p) => p.weave === "hand_knotted") ?? products[0];
  const cities = Object.entries(
    products.reduce<Record<string, number>>((acc, p) => ((acc[p.originCity] = (acc[p.originCity] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1]);
  const botUrl = env.telegramBotUsername ? `https://t.me/${env.telegramBotUsername}` : "/seller";

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div>
          <h1 className="font-display text-5xl leading-[1.05] text-indigo sm:text-6xl lg:text-7xl">{t("home.heroTitle")}</h1>
          <p className="mt-6 max-w-[34rem] text-lg text-ink/80">{t("home.heroBody")}</p>
          <Link href="/rugs" className="btn mt-8">{t("home.heroCta")}</Link>
        </div>
        {hero && (
          <Link href={`/rugs/${hero.slug}`} className="group relative mx-auto block w-full max-w-sm">
            {/* Architect-style dimension lines: the size is the first fact a buyer needs. */}
            <div className="relative ps-10 pt-10">
              <div className="absolute end-0 start-10 top-3 flex items-center gap-2 text-xs text-ash">
                <span className="h-px flex-1 bg-ash/50" />
                <span>{hero.widthCm} cm</span>
                <span className="h-px flex-1 bg-ash/50" />
              </div>
              <div className="absolute bottom-0 start-0 top-10 flex w-8 flex-col items-center gap-2 text-xs text-ash">
                <span className="w-px flex-1 bg-ash/50" />
                <span className="[writing-mode:vertical-rl]">{hero.lengthCm} cm</span>
                <span className="w-px flex-1 bg-ash/50" />
              </div>
              <RugArt
                seed={hero.artSeed}
                widthCm={hero.widthCm}
                lengthCm={hero.lengthCm}
                className="w-full shadow-[0_30px_60px_-30px_rgba(36,28,24,0.6)]"
                title={pickText(hero.title, locale)}
              />
            </div>
            <p className="mt-4 text-sm text-ash">
              {pickText(hero.title, locale)}, {hero.originCity}
            </p>
          </Link>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-3xl text-indigo">{t("home.newest")}</h2>
          <Link href="/rugs" className="text-sm text-lac underline-offset-4 hover:underline">{t("home.seeAll")}</Link>
        </div>
        <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </section>

      {cities.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-3xl text-indigo">{t("home.byCity")}</h2>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 font-display text-2xl">
            {cities.map(([city, n]) => (
              <li key={city}>
                <Link href={{ pathname: "/rugs", query: { city } }} className="hover:text-lac">
                  {city} <span className="font-sans text-sm text-ash">{n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 bg-wool-deep">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl text-indigo">{t("home.trustTitle")}</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="border-t-2 border-lac pt-5">
                <span className="font-display text-4xl text-lac">{n}</span>
                <h3 className="mt-2 text-lg font-medium">{t(`home.trust${n}Title`)}</h3>
                <p className="mt-2 text-ink/75">{t(`home.trust${n}Body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-8 bg-indigo px-8 py-12 text-wool md:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="font-display text-3xl">{t("home.sellerTitle")}</h2>
            <p className="mt-3 max-w-prose text-wool/80">{t("home.sellerBody")}</p>
          </div>
          <a href={botUrl} className="btn justify-self-start bg-saffron text-ink hover:bg-wool md:justify-self-end">
            {t("home.sellerCta")}
          </a>
        </div>
      </section>
    </>
  );
}
