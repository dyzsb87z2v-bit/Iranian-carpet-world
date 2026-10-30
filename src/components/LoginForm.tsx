"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "@/app/[locale]/login/actions";

export function LoginForm({ next, linkError }: { next: string; linkError?: boolean }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });
  if (state.status === "sent") return <p role="status">{t("sent")}</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">{t("email")}</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field" />
      </div>
      {state.status === "idle" && linkError && <p role="alert" className="text-sm text-lac">{t("linkError")}</p>}
      {state.status === "rate" && <p role="alert" className="text-sm text-lac">{t("rateLimited")}</p>}
      {state.status === "error" && <p role="alert" className="text-sm text-lac">{t("sendFailed")}</p>}
      <button className="btn" disabled={pending}>{t("send")}</button>
    </form>
  );
}
