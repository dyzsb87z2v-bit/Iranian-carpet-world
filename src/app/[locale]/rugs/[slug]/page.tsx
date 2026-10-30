import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InquiryForm } from "@/components/InquiryForm";
import { LandedCostPanel } from "@/components/LandedCostPanel";
import { RugArt } from "@/components/RugArt";
import { ScaleDrawing } from "@/components/ScaleDrawing";
import { getProduct } from "@/lib/catalog";
import { formatEur, formatNumber } from "@/lib/format";
import { getPublicRates } from "@/lib/settings";
import { pickText } from "@/lib/types";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  return { title: pickText(p.title, locale), description: pickText(p.description, locale).slice(0, 160) };
}

export default async function RugPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProduct(slug);
  if (!product) notFound();
  const t = await getTranslations();
  const rates = await getPublicRates();
  const title = pickText(product.title, locale);
  const area = ((product.lengthCm * product.widthCm) / 10_000).toFixed(2);
  const sellerName = locale === "fa" && product.seller.shopNameFa ? product.seller.shopNameFa : product.seller.shopName;
  const material = (m: string) => (m ? t.has(`enum.material.${m}`) ? t(`enum.material.${m}`) : m : null);

  const specs: [string, string | null][] = [
    [t("product.size"), `${product.lengthCm} × ${product.widthCm} cm (${t("product.area", { area })})`],
    [t("product.weave"), t(`enum.weave.${product.weave}`)],
    [t("product.pile"), material(product.pileMaterial)],
    [t("product.foundation"), material(product.foundationMaterial)],
    [t("product.origin"), [product.originCity, product.originRegion].filter(Boolean).join(", ")],
    [t("product.design"), product.design],
    [t("product.colors"), product.colors.length ? product.colors.join(", ") : null],
    [t("product.knots"), product.knotDensityPerDm2 ? t("product.knotsValue", { value: formatNumber(product.knotDensityPerDm2, locale) }) : null],
    [t("product.age"), product.approxAgeYears !== null ? t("product.ageValue", { years: product.approxAgeYears }) : null],
    [t("product.condition"), [t(`enum.condition.${product.condition}`), product.conditionNotes].filter(Boolean).join(". ")],
    [t("product.authenticity"), [product.authenticityNotes, product.hasCertificate ? t("product.certificate") : null].filter(Boolean).join(" ") || null],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: pickText(product.description, locale),
    brand: { "@type": "Brand", name: product.seller.shopName },
    ...(product.priceEur !== null && {
      offers: { "@type": "Offer", priceCurrency: "EUR", price: product.priceEur, availability: product.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut" },
    }),
  };

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <div className="flex min-h-[28rem] items-center justify-center bg-wool-deep p-8">
            {product.imageUrls[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrls[0]} alt={title} className="max-h-[70vh] object-contain shadow-lg" />
            ) : (
              <RugArt seed={product.artSeed} widthCm={product.widthCm} lengthCm={product.lengthCm} kilim={product.weave === "hand_woven_kilim"}
                className="max-h-[70vh] w-auto max-w-full drop-shadow-xl" title={title} />
            )}
          </div>
          {product.imageUrls.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.imageUrls.slice(1, 9).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="aspect-square w-full bg-wool-deep object-cover" loading="lazy" />
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-4xl leading-tight text-indigo sm:text-5xl">{title}</h1>
          <p className="mt-2 text-ash">
            {t("product.seller")} {sellerName}, {product.seller.city}
            {product.seller.isVerified && <span className="ms-2 rounded-sm bg-indigo px-2 py-0.5 text-xs text-wool">{t("product.verifiedSeller")}</span>}
          </p>
          <p className="mt-6 text-3xl tabular-nums">
            {product.priceEur !== null ? formatEur(product.priceEur, locale) : t("product.priceOnRequest")}
          </p>
          <p className="mt-1 text-sm text-ash">{product.quantity > 0 ? t("product.inStock") : t("product.soldOut")}</p>

          <p className="mt-6 max-w-prose leading-relaxed">{pickText(product.description, locale)}</p>

          {product.priceEur !== null && (
            <div className="mt-8">
              <LandedCostPanel priceEur={product.priceEur} lengthCm={product.lengthCm} widthCm={product.widthCm}
                weave={product.weave} weightKg={product.weightKg} rates={rates} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <h2 className="font-display text-3xl text-indigo">{t("product.details")}</h2>
          <dl className="mt-6 grid gap-x-8 sm:grid-cols-[auto_1fr]">
            {specs.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="border-t border-ink/10 py-3 text-ash">{k}</dt>
                <dd className="border-t border-ink/10 py-3 max-sm:border-0 max-sm:pt-0">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h2 className="font-display text-3xl text-indigo">{t("product.scaleTitle")}</h2>
          <div className="mt-6">
            <ScaleDrawing lengthCm={product.lengthCm} widthCm={product.widthCm} label={`${product.lengthCm} × ${product.widthCm} cm`} />
            <p className="mt-2 text-sm text-ash">{t("product.scaleNote")}</p>
          </div>
        </section>
      </div>

      <section className="mt-16 max-w-2xl" id="inquire">
        <h2 className="font-display text-3xl text-indigo">{t("product.inquireTitle")}</h2>
        <p className="mt-2 text-ink/75">{t("product.inquireBody")}</p>
        <div className="mt-6">
          {/* Payments stay off until the legal path is confirmed; buyers send a request instead. */}
          <InquiryForm productId={product.id} />
        </div>
      </section>
    </article>
  );
}
