import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard } from "@/components/ProductCard";
import { Link } from "@/i18n/navigation";
import { listOriginCities, listProducts } from "@/lib/catalog";
import { conditions, materials, parseFilters, weaves } from "@/lib/filters";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: t("catalog.title") };
}

export default async function Catalog({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const filters = parseFilters(await searchParams);
  const [products, cities] = await Promise.all([listProducts(filters), listOriginCities()]);

  const select = (name: string, label: string, options: readonly string[], labelFor: (o: string) => string, value?: string) => (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <select id={name} name={name} defaultValue={value ?? ""} className="field">
        <option value="">{t("catalog.any")}</option>
        {options.map((o) => (
          <option key={o} value={o}>{labelFor(o)}</option>
        ))}
      </select>
    </div>
  );

  const range = (prefix: "Price" | "Length", label: string) => (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex gap-2">
        <input name={`min${prefix}`} type="number" min={0} inputMode="numeric" placeholder={t("catalog.min")} aria-label={`${label} ${t("catalog.min")}`}
          defaultValue={filters[`min${prefix}` as const] ?? ""} className="field" />
        <input name={`max${prefix}`} type="number" min={0} inputMode="numeric" placeholder={t("catalog.max")} aria-label={`${label} ${t("catalog.max")}`}
          defaultValue={filters[`max${prefix}` as const] ?? ""} className="field" />
      </div>
    </fieldset>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-4xl text-indigo">{t("catalog.title")}</h1>
        <p className="text-ash">{t("catalog.count", { count: products.length })}</p>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[16rem_1fr]">
        <form className="space-y-5" method="get">
          <div>
            <label htmlFor="q" className="label">{t("catalog.search")}</label>
            <input id="q" name="q" type="search" defaultValue={filters.q ?? ""} className="field" />
          </div>
          {range("Price", t("catalog.price"))}
          {range("Length", t("catalog.length"))}
          {select("material", t("catalog.material"), materials, (o) => t(`enum.material.${o}`), filters.material)}
          {select("weave", t("catalog.weave"), weaves, (o) => t(`enum.weave.${o}`), filters.weave)}
          {select("city", t("catalog.city"), cities, (o) => o, filters.city)}
          {select("condition", t("catalog.condition"), conditions, (o) => t(`enum.condition.${o}`), filters.condition)}
          <div>
            <label htmlFor="sort" className="label">{t("catalog.sort")}</label>
            <select id="sort" name="sort" defaultValue={filters.sort ?? "newest"} className="field">
              <option value="newest">{t("catalog.sortNewest")}</option>
              <option value="price_asc">{t("catalog.sortPriceAsc")}</option>
              <option value="price_desc">{t("catalog.sortPriceDesc")}</option>
              <option value="size_desc">{t("catalog.sortSize")}</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn">{t("catalog.apply")}</button>
            <Link href="/rugs" className="btn-ghost">{t("catalog.clear")}</Link>
          </div>
        </form>

        <div>
          {products.length === 0 ? (
            <p className="max-w-prose text-ink/75">{t("catalog.empty")}</p>
          ) : (
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
