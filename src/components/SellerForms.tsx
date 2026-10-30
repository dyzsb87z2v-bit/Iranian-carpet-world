"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { addRug, registerShop, type FormState } from "@/app/[locale]/seller/actions";

const initial: FormState = { status: "idle" };

function Field({ name, label, type = "text", required = false, ...rest }: { name: string; label: string; type?: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type={type} required={required} className="field" {...rest} />
    </div>
  );
}

export function RegisterShopForm() {
  const t = useTranslations("seller");
  const [state, action, pending] = useActionState(registerShop, initial);
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <Field name="shopName" label={t("shopName")} required />
      <Field name="shopNameFa" label={t("shopNameFa")} dir="rtl" />
      <Field name="city" label={t("city")} required />
      <Field name="phone" label={t("phone")} type="tel" />
      {state.status === "error" && <p role="alert" className="text-sm text-lac">{state.message}</p>}
      <button className="btn justify-self-start" disabled={pending}>{t("submitShop")}</button>
    </form>
  );
}

export function AddRugForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(addRug, initial);
  if (state.status === "ok") return <p role="status" className="border-s-2 border-lac ps-4">{t("seller.submitted")}</p>;
  const sel = (name: string, label: string, opts: string[], ns: string) => (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <select id={name} name={name} className="field" required>
        {opts.map((o) => <option key={o} value={o}>{t(`${ns}.${o}`)}</option>)}
      </select>
    </div>
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field name="titleFa" label={t("seller.titleFa")} required dir="rtl" /></div>
      <Field name="originCity" label={t("catalog.city")} required />
      <Field name="design" label={t("product.design")} />
      <Field name="lengthCm" label={t("seller.lengthCm")} type="number" min={20} required />
      <Field name="widthCm" label={t("seller.widthCm")} type="number" min={20} required />
      {sel("weave", t("catalog.weave"), ["hand_knotted", "hand_woven_kilim", "machine_made"], "enum.weave")}
      {sel("condition", t("catalog.condition"), ["new", "vintage", "antique", "used"], "enum.condition")}
      {sel("pileMaterial", t("product.pile"), ["wool", "silk", "wool_silk", "kork_wool"], "enum.material")}
      {sel("foundationMaterial", t("product.foundation"), ["cotton", "wool", "silk"], "enum.material")}
      <Field name="approxAgeYears" label={t("seller.ageYears")} type="number" min={0} />
      <Field name="priceToman" label={t("seller.priceToman")} type="number" min={0} required />
      <div className="sm:col-span-2">
        <label htmlFor="descriptionFa" className="label">{t("seller.descriptionFa")}</label>
        <textarea id="descriptionFa" name="descriptionFa" rows={4} className="field" dir="rtl" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="photos" className="label">Photos</label>
        <input id="photos" name="photos" type="file" accept="image/*" multiple className="field" />
      </div>
      {state.status === "error" && <p role="alert" className="text-sm text-lac sm:col-span-2">{state.message}</p>}
      <button className="btn justify-self-start" disabled={pending}>{t("seller.submitForReview")}</button>
    </form>
  );
}
