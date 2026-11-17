import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import { StateMessage } from "@/components/ui/state-message";
import { getDb } from "@/server/db/client";
import { hasActiveFilters, parseListingParams, type RawSearchParams } from "@/server/catalog/filters";
import {
  listCategories,
  listMaterialsWithFinishes,
  listProducts,
  type CategorySummary,
} from "@/server/catalog/queries";
import { FilterDisclosure } from "./filter-disclosure";
import { FilterForm } from "./filter-form";
import { ProductGrid } from "./product-card";

/** Shared listing for /shop and /shop/[category]. */
export async function ListingView({
  searchParams,
  category,
}: {
  searchParams: RawSearchParams;
  category?: CategorySummary;
}) {
  const db = await getDb();
  const filters = parseListingParams(searchParams, category?.slug);
  const [products, categories, materials] = await Promise.all([
    listProducts(db, filters),
    listCategories(db),
    listMaterialsWithFinishes(db),
  ]);

  const action = category ? `/shop/${category.slug}` : "/shop";
  const active = hasActiveFilters(filters);
  const activeCount =
    (filters.q ? 1 : 0) +
    (filters.price ? 1 : 0) +
    (filters.width ? 1 : 0) +
    filters.materialCodes.length +
    filters.finishCodes.length;
  const title = filters.q ? `Results for “${filters.q}”` : (category?.name ?? "All furniture");
  const tabs = [{ href: "/shop", label: "All", current: !category }].concat(
    categories
      .filter((c) => c.productCount > 0)
      .map((c) => ({ href: `/shop/${c.slug}`, label: c.name, current: c.slug === category?.slug })),
  );

  return (
    <div className="page py-10 sm:py-14">
      <header className="max-w-3xl">
        <h1 className="text-title">{title}</h1>
        {category && !filters.q ? <p className="mt-3 text-lg text-ink-soft">{category.description}</p> : null}
        {filters.q && category ? <p className="mt-3 text-lg text-ink-soft">In {category.name}</p> : null}
      </header>

      <nav aria-label="Furniture categories" className="-mx-1 mt-8 overflow-x-auto pb-1">
        <ul className="flex gap-2 px-1 whitespace-nowrap">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={tab.current ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-full border px-4 text-[0.95rem] ${
                  tab.current ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
        <aside aria-label="Filters">
          <FilterDisclosure activeCount={activeCount}>
            <FilterForm action={action} filters={filters} materials={materials} />
          </FilterDisclosure>
        </aside>

        <section aria-label="Products">
          <p className="mb-6 text-ink-soft" role="status">
            {products.length} {products.length === 1 ? "product" : "products"}
            {active ? " match your filters" : ""}
          </p>
          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <StateMessage
              title={active ? "No furniture matches these filters" : "Nothing here yet"}
              actions={
                <>
                  {active ? (
                    <ButtonLink href={action} variant="primary">
                      Clear filters
                    </ButtonLink>
                  ) : null}
                  {category || !active ? (
                    <ButtonLink href="/shop" variant="secondary">
                      View all furniture
                    </ButtonLink>
                  ) : null}
                </>
              }
            >
              {active ? (
                <p>Try a wider price or width range, fewer finishes, or a different search term.</p>
              ) : (
                <p>No products have been published in this section.</p>
              )}
            </StateMessage>
          )}
        </section>
      </div>
    </div>
  );
}
