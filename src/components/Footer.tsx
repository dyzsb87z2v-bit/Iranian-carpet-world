import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations();
  return (
    <footer className="mt-24 bg-indigo text-wool/80">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-[1fr_2fr]">
        <div>
          <p className="font-display text-2xl text-wool">{t("brand.name")}</p>
          <p className="mt-1 text-sm">{t("brand.tagline")}</p>
          <p className="mt-4 text-sm">{t("footer.based")}</p>
        </div>
        <p className="max-w-prose text-sm leading-relaxed">{t("footer.legal")}</p>
      </div>
    </footer>
  );
}
