import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { LocaleSwitcher } from "./LocaleSwitcher";

export async function Header() {
  const t = await getTranslations();
  const session = await getSession();
  return (
    <header className="border-b border-ink/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-display text-2xl font-semibold tracking-wide text-lac">{t("brand.name")}</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/rugs" className="hover:text-lac">{t("nav.rugs")}</Link>
          <Link href="/seller" className="hover:text-lac">{session?.seller ? t("nav.dashboard") : t("nav.sellers")}</Link>
          {session?.role === "admin" && <Link href="/admin" className="hover:text-lac">{t("nav.admin")}</Link>}
          {session ? (
            <form action="/auth/signout" method="post">
              <button className="text-ash hover:text-lac">{t("nav.logout")}</button>
            </form>
          ) : (
            <Link href="/login" className="hover:text-lac">{t("nav.login")}</Link>
          )}
          <LocaleSwitcher label={t("nav.language")} />
        </nav>
      </div>
    </header>
  );
}
