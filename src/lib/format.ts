const intlLocale = (locale: string) => (locale === "fa" ? "fa-IR" : locale === "de" ? "de-DE" : "en-GB");

export const formatEur = (value: number, locale: string) =>
  new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "EUR", maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);

export const formatNumber = (value: number, locale: string) => new Intl.NumberFormat(intlLocale(locale)).format(value);

export const formatPercent = (value: number, locale: string) =>
  new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 1 }).format(value);

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60);
