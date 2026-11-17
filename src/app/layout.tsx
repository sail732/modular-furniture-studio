import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "@fontsource-variable/instrument-sans/wght.css";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { getDb } from "@/server/db/client";
import { listCategories } from "@/server/catalog/queries";
import { SampleNotice } from "@/components/layout/sample-notice";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

// Catalog pages read from the database on every request in Phase 1.
// Caching is introduced deliberately in a later phase (see docs/architecture.md).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} | ${siteConfig.tagline}`, template: `%s | ${siteConfig.name}` },
  description:
    "Configurable furniture built from standard, reusable parts. Choose a design, set the size and finish, and receive it flat-packed and labeled for assembly.",
  openGraph: { type: "website", siteName: siteConfig.name, locale: "en_US" },
  // Sample catalogs must not be indexed.
  robots: siteConfig.catalogIsSample ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = { themeColor: "#eef0eb" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The shell still renders if the database is unavailable; pages show their own error state.
  const categories = await getDb()
    .then(listCategories)
    .catch((error) => {
      console.error("layout: could not load categories", error);
      return [];
    });

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <SampleNotice />
        <SiteHeader categories={categories} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter categories={categories} />
      </body>
    </html>
  );
}
