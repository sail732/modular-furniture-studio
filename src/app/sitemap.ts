import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getDb } from "@/server/db/client";
import { listCategories, listProducts } from "@/server/catalog/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();
  const [categories, products] = await Promise.all([listCategories(db), listProducts(db)]);
  const url = (path: string) => `${siteConfig.url}${path}`;
  return [
    ...["", "/shop", "/how-it-works", "/materials", "/delivery-assembly", "/about", "/contact"].map((p) => ({
      url: url(p),
    })),
    ...categories.filter((c) => c.productCount > 0).map((c) => ({ url: url(`/shop/${c.slug}`) })),
    ...products.map((p) => ({ url: url(`/products/${p.slug}`) })),
  ];
}
