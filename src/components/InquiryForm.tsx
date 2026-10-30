"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { submitInquiry, type InquiryState } from "@/app/[locale]/rugs/[slug]/actions";
import { destinationCountries } from "@/lib/landed-cost";

export function InquiryForm({ productId }: { productId: string }) {
  const t = useTranslations("product");
  const tc = useTranslations("enum.country");
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiry, { status: "idle" });

  if (state.status === "sent") return <p role="status" className="border-s-2 border-lac ps-4">{t("sent")}</p>;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">{t("name")}</label>
          <input id="name" name="name" required maxLength={120} className="field" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="email" className="label">{t("email")}</label>
          <input id="email" name="email" type="email" required className="field" autoComplete="email" />
        </div>
      </div>
      <div>
        <label htmlFor="country" className="label">{t("country")}</label>
        <select id="country" name="country" className="field" defaultValue="DE">
          {destinationCountries.map((d) => (
            <option key={d} value={d}>{tc(d)}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="message" className="label">{t("message")}</label>
        <textarea id="message" name="message" rows={3} maxLength={2000} className="field" />
      </div>
      {state.status === "error" && <p role="alert" className="text-sm text-lac">{t("sendError")}</p>}
      <button className="btn" disabled={pending}>{t("send")}</button>
    </form>
  );
}
