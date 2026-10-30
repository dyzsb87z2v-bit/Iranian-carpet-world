import { defineRouting } from "next-intl/routing";

export const locales = ["en", "de", "fa"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
});

export const rtlLocales: readonly Locale[] = ["fa"];
export const isRtl = (locale: string) => rtlLocales.includes(locale as Locale);
