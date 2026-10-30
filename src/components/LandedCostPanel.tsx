"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { destinationCountries, estimateLandedCost, type Destination, type LandedCostRates } from "@/lib/landed-cost";
import { formatEur, formatPercent } from "@/lib/format";
import type { Weave } from "@/lib/types";

interface Props {
  priceEur: number;
  lengthCm: number;
  widthCm: number;
  weave: Weave;
  weightKg: number | null;
  rates: LandedCostRates;
}

export function LandedCostPanel(props: Props) {
  const t = useTranslations("product");
  const tc = useTranslations("enum.country");
  const locale = useLocale();
  const [dest, setDest] = useState<Destination>("DE");
  const c = estimateLandedCost({ ...props, destination: dest });
  const eur = (n: number) => formatEur(n, locale);

  const rows: [string, number][] = [
    [t("goods"), c.goods],
    [t("shipping", { kg: c.weightKg }), c.shipping],
    [t("insurance"), c.insurance],
    [t("duty", { rate: formatPercent(c.dutyRate, locale) }), c.duty],
    [t("vat", { rate: formatPercent(c.vatRate, locale) }), c.importVat],
    [t("clearance"), c.clearance],
  ];

  return (
    <section aria-labelledby="landed" className="border border-ink/15 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="landed" className="text-lg font-medium">{t("landedTitle")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ash">{t("shipTo")}</span>
          <select value={dest} onChange={(e) => setDest(e.target.value as Destination)} className="rounded-sm border border-ink/20 bg-transparent px-2 py-1">
            {destinationCountries.map((d) => (
              <option key={d} value={d}>{tc(d)}</option>
            ))}
          </select>
        </label>
      </div>
      <dl className="mt-4 divide-y divide-ink/10 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2">
            <dt className="text-ink/75">{label}</dt>
            <dd className="tabular-nums">{eur(value)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 pt-3 text-base font-medium">
          <dt>{t("total")}</dt>
          <dd className="tabular-nums text-lac" aria-live="polite">{eur(c.total)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-ash">{t("landedNote")}</p>
    </section>
  );
}
