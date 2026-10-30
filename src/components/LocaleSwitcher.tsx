"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { locales } from "@/i18n/routing";

const names: Record<string, string> = { en: "English", de: "Deutsch", fa: "فارسی" };

export function LocaleSwitcher({ label }: { label: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={(e) => {
          const q = search.toString();
          router.replace(q ? `${pathname}?${q}` : pathname, { locale: e.target.value });
        }}
        className="rounded-sm border border-ink/20 bg-transparent px-2 py-1 text-sm"
      >
        {locales.map((l) => (
          <option key={l} value={l}>{names[l]}</option>
        ))}
      </select>
    </label>
  );
}
