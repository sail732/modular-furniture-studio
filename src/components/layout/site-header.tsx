import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { CategorySummary } from "@/server/catalog/queries";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";
import { SearchForm } from "./search-form";

const primaryLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/materials", label: "Materials & finishes" },
  { href: "/delivery-assembly", label: "Delivery & assembly" },
];

export function SiteHeader({ categories }: { categories: CategorySummary[] }) {
  const categoryLinks = [
    ...categories.map((c) => ({ href: `/shop/${c.slug}`, label: c.name })),
    { href: "/configurations", label: "Saved designs" },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="page relative flex min-h-16 items-center justify-between gap-6 lg:min-h-20">
        <Link href="/" className="font-display text-xl font-semibold leading-none tracking-tight sm:text-2xl">
          {siteConfig.name}
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-[0.95rem]">
            {primaryLinks.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} className="inline-flex min-h-11 items-center">
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden w-64 lg:block">
          <SearchForm idSuffix="desktop" />
        </div>
        <MobileMenu primary={primaryLinks} categories={categoryLinks} />
      </div>
    </header>
  );
}
