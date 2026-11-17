import Link from "next/link";
import { siteConfig } from "@/config/site";
import { policyPages } from "@/config/policies";
import type { CategorySummary } from "@/server/catalog/queries";

function FooterList({ title, links }: { title: string; links: { href: string; label: string; external?: boolean }[] }) {
  if (links.length === 0) return null;
  return (
    <nav aria-label={title}>
      <h2 className="font-sans text-sm font-medium tracking-normal text-paper/70">{title}</h2>
      <ul className="mt-3 space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a href={link.href} rel="noopener noreferrer" className="inline-flex min-h-9 items-center hover:underline">
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="inline-flex min-h-9 items-center hover:underline">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter({ categories }: { categories: CategorySummary[] }) {
  const { contact, social } = siteConfig;
  return (
    <footer className="mt-auto bg-ink text-paper">
      <div className="page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight">{siteConfig.name}</p>
          <p className="mt-3 max-w-xs text-paper/75">{siteConfig.tagline}.</p>
          <div className="mt-5 space-y-1 text-paper/85">
            {contact.email ? (
              <p>
                <a href={`mailto:${contact.email}`} className="hover:underline">
                  {contact.email}
                </a>
              </p>
            ) : null}
            {contact.phone ? <p>{contact.phone}</p> : null}
            {!contact.email && !contact.phone ? (
              <p className="text-paper/60">Contact details have not been set up yet.</p>
            ) : null}
          </div>
        </div>
        <FooterList
          title="Shop"
          links={[
            { href: "/shop", label: "All furniture" },
            ...categories.map((c) => ({ href: `/shop/${c.slug}`, label: c.name })),
            { href: "/configurations", label: "Saved designs" },
          ]}
        />
        <FooterList
          title="About"
          links={[
            { href: "/how-it-works", label: "How it works" },
            { href: "/materials", label: "Materials & finishes" },
            { href: "/delivery-assembly", label: "Delivery & assembly" },
            { href: "/about", label: "About us" },
            { href: "/contact", label: "Contact & FAQ" },
            ...social.map((s) => ({ href: s.href, label: s.label, external: true })),
          ]}
        />
        <FooterList title="Policies" links={policyPages.map((p) => ({ href: `/legal/${p.slug}`, label: p.title }))} />
      </div>
      <div className="border-t border-paper/15">
        <p className="page py-5 text-sm text-paper/60">
          © {new Date().getFullYear()} {siteConfig.name}
          {siteConfig.catalogIsSample ? ". Preview build with sample content." : "."}
        </p>
      </div>
    </footer>
  );
}
