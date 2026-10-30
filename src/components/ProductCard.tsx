import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";
import { pickText, type Product } from "@/lib/types";
import { RugArt } from "./RugArt";

export async function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const t = await getTranslations();
  const title = pickText(product.title, locale);
  // Fixed-height frame; the rug sits inside at its own proportion.
  return (
    <Link href={`/rugs/${product.slug}`} className="group block">
      <div className="flex aspect-[4/5] items-center justify-center bg-wool-deep p-6">
        {product.imageUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrls[0]} alt={title} className="max-h-full max-w-full object-contain shadow-md" loading="lazy" />
        ) : (
          <RugArt
            seed={product.artSeed}
            widthCm={product.widthCm}
            lengthCm={product.lengthCm}
            kilim={product.weave === "hand_woven_kilim"}
            className="max-h-full max-w-full drop-shadow-md transition-transform duration-300 group-hover:scale-[1.02]"
            title={title}
          />
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl leading-tight group-hover:text-lac">{title}</h3>
          <p className="mt-1 text-sm text-ash">
            {product.lengthCm} × {product.widthCm} cm, {product.originCity}
          </p>
        </div>
        <p className="shrink-0 text-base tabular-nums">
          {product.priceEur !== null ? formatEur(product.priceEur, locale) : t("product.priceOnRequest")}
        </p>
      </div>
    </Link>
  );
}
