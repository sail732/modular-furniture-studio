"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { NavLink } from "./nav-link";
import { SearchForm } from "./search-form";

export interface MenuLink {
  href: string;
  label: string;
}

export function MobileMenu({ primary, categories }: { primary: MenuLink[]; categories: MenuLink[] }) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const pathname = usePathname();
  const panelId = useId();
  // Close when the route changes (derived state, no effect needed).
  const isOpen = open && openedAt === pathname;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          setOpen(!isOpen);
          setOpenedAt(pathname);
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-ink/60 px-4 text-[0.95rem] font-medium"
      >
        <span aria-hidden="true" className="relative block h-3 w-4">
          <span className={`absolute inset-x-0 top-0 h-0.5 bg-ink transition-transform ${isOpen ? "translate-y-[5px] rotate-45" : ""}`} />
          <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-ink transition-transform ${isOpen ? "-translate-y-[5px] -rotate-45" : ""}`} />
        </span>
        {isOpen ? "Close" : "Menu"}
      </button>
      <div
        id={panelId}
        hidden={!isOpen}
        className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-5rem)] overflow-y-auto border-b border-line bg-surface shadow-lift"
      >
        <div className="page py-6">
          <SearchForm idSuffix="mobile" />
          <nav aria-label="Main" className="mt-6">
            <ul className="divide-y divide-line-soft border-y border-line-soft text-lg">
              {primary.map((link) => (
                <li key={link.href}>
                  <NavLink href={link.href} className="flex min-h-12 items-center" onNavigate={() => setOpen(false)}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          {categories.length > 0 ? (
            <nav aria-label="Furniture categories" className="mt-6">
              <h2 className="font-sans text-sm font-medium tracking-normal text-ink-soft">Shop by category</h2>
              <ul className="mt-2">
                {categories.map((link) => (
                  <li key={link.href}>
                    <NavLink href={link.href} className="flex min-h-11 items-center" onNavigate={() => setOpen(false)}>
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
