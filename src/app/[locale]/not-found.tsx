import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl text-indigo">404</h1>
      <Link href="/rugs" className="btn mt-8">{t("home.seeAll")}</Link>
    </div>
  );
}
