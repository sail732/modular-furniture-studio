import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // A sample catalog must not be indexed.
  if (siteConfig.catalogIsSample) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/legal/"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
