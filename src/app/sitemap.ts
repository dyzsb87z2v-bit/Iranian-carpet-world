import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { listProducts } from "@/lib/catalog";
import { env } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listProducts();
  const paths = ["", "/rugs", ...products.map((p) => `/rugs/${p.slug}`)];
  return paths.map((path) => ({
    url: `${env.siteUrl}/en${path}`,
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${env.siteUrl}/${l}${path}`])) },
  }));
}
