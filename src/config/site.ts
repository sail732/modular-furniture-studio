/**
 * Brand and business configuration.
 *
 * Everything customer-facing that identifies the business lives here and is
 * read from environment variables, so the placeholder brand is never hardcoded
 * in pages or components. Values left empty are simply not rendered.
 */
function env(name: string, fallback = ""): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

export const siteConfig = {
  name: env("SITE_NAME", "Modular Furniture Studio"),
  tagline: env("SITE_TAGLINE", "Furniture built from parts that fit"),
  url: env("SITE_URL", "http://localhost:3000").replace(/\/$/, ""),
  locale: "en-US",
  currency: "USD",
  contact: {
    email: env("SITE_CONTACT_EMAIL"),
    phone: env("SITE_CONTACT_PHONE"),
  },
  social: [
    { label: "Instagram", href: env("SITE_SOCIAL_INSTAGRAM") },
    { label: "Pinterest", href: env("SITE_SOCIAL_PINTEREST") },
  ].filter((link) => link.href !== ""),
  /** True until the catalog, prices and policies are real and reviewed. */
  catalogIsSample: env("CATALOG_IS_SAMPLE", "true") !== "false",
} as const;

export type SiteConfig = typeof siteConfig;
