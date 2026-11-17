import Link from "next/link";
import { Elevation } from "@/components/furniture/elevation";
import { Price } from "@/components/ui/price";
import { formatLength } from "@/lib/units";
import type { ProductSummary } from "@/server/catalog/queries";
import { FinishDots } from "./finish-dots";

export function ProductCard({ product }: { product: ProductSummary }) {
  const template = product.primaryTemplate;
  const finish = product.finishes[0];
  return (
    <article className="group relative flex flex-col">
      <div className="aspect-[4/3] overflow-hidden rounded-panel bg-surface ring-1 ring-line-soft transition-shadow group-hover:shadow-lift">
        <Elevation
          layout={template.layout}
          widthUm={template.widthUm}
          heightUm={template.heightUm}
          finishHex={finish?.swatchHex ?? "#C7CEC6"}
          label={`${product.name}, ${template.name}`}
          className="size-full"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div>
          <h3 className="text-xl leading-tight">
            <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-ink-soft">{product.category.name}</p>
        </div>
        <Price cents={product.startingPriceCents} currency={product.currency} prefix="From" className="shrink-0 text-lg" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 text-sm text-ink-soft">
        <span>
          {formatLength(product.minWidthUm)} to {formatLength(product.maxWidthUm)} wide
          {product.templateCount > 1 ? `, ${product.templateCount} designs` : ""}
        </span>
        <FinishDots finishes={product.finishes} />
      </div>
    </article>
  );
}

export function ProductGrid({ products, columns = 3 }: { products: ProductSummary[]; columns?: 3 | 4 }) {
  return (
    <ul
      className={`grid gap-x-6 gap-y-12 sm:grid-cols-2 ${columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
    >
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
