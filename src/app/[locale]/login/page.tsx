import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/LoginForm";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl text-indigo">{t("title")}</h1>
      <p className="mt-3 text-ink/75">{isSupabaseConfigured() ? t("body") : t("demo")}</p>
      <div className="mt-8">
        <LoginForm next={next && next.startsWith("/") ? next : "/"} />
      </div>
    </div>
  );
}
