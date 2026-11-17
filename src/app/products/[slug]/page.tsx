import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/catalog/product-card";
import { Elevation } from "@/components/furniture/elevation";
import { ButtonLink } from "@/components/ui/button-link";
import { Price } from "@/components/ui/price";
import { SampleTag } from "@/components/ui/sample-tag";
import { allowedWidths } from "@/lib/width-options";
import { formatDimensions, formatLength } from "@/lib/units";
import { getDb } from "@/server/db/client";
import { getProductBySlug, listRelatedProducts } from "@/server/catalog/queries";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const difficultyLabel = { easy: "Easy", moderate: "Moderate", advanced: "Advanced" } as const;

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return rest === 0 ? h : `${h} ${rest} minutes`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(await getDb(), slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description: product.shortDescription, url: `/products/${product.slug}` },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const db = await getDb();
  const product = await getProductBySlug(db, slug);
  if (!product) notFound();
  const related = await listRelatedProducts(db, product, 3);

  // Selection lives in the URL so a view can be shared; unknown values fall back to defaults.
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const template = product.templates.find((t) => t.code === pick(query.design)) ?? product.templates[0];
  const finish = product.finishes.find((f) => f.code === pick(query.finish)) ?? product.finishes[0];
  const href = (design: string, finishCode?: string) => {
    const p = new URLSearchParams();
    if (design !== product.templates[0].code) p.set("design", design);
    if (finishCode && finishCode !== product.finishes[0]?.code) p.set("finish", finishCode);
    const qs = p.toString();
    return `/products/${product.slug}${qs ? `?${qs}` : ""}`;
  };
  const size = { widthUm: template.widthUm, heightUm: template.heightUm, depthUm: template.depthUm };
  const materialsByName = Map.groupBy(product.finishes, (f) => f.materialName);

  return (
    <>
      <div className="page pt-6">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
            <li>
              <Link href="/shop" className="hover:underline">
                Shop
              </Link>
              <span aria-hidden="true" className="ml-2">
                /
              </span>
            </li>
            <li>
              <Link href={`/shop/${product.category.slug}`} className="hover:underline">
                {product.category.name}
              </Link>
              <span aria-hidden="true" className="ml-2">
                /
              </span>
            </li>
            <li aria-current="page" className="text-ink">
              {product.name}
            </li>
          </ol>
        </nav>
      </div>

      <div className="page grid gap-10 py-8 *:min-w-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16 lg:py-12">
        <div>
          <figure className="lg:sticky lg:top-28">
            <div className="aspect-[4/3] rounded-panel bg-surface ring-1 ring-line-soft">
              <Elevation
                layout={template.layout}
                widthUm={template.widthUm}
                heightUm={template.heightUm}
                finishHex={finish?.swatchHex ?? "#C7CEC6"}
                label={`${product.name}, ${template.name}${finish ? `, in ${finish.name}` : ""}`}
                showDimensions
                className="size-full"
              />
            </div>
            <figcaption className="mt-3 text-sm text-ink-soft">
              Front-view illustration at the standard size{finish ? `, shown in ${finish.name}` : ""}. Not a
              photograph; screen colours are approximate.
            </figcaption>
          </figure>
        </div>

        <div>
          {product.isSample ? <SampleTag>Sample product</SampleTag> : null}
          <h1 className="mt-3 text-title">{product.name}</h1>
          <p className="mt-3 text-lg text-ink-soft">{product.shortDescription}</p>
          <p className="mt-5 text-2xl">
            <Price cents={template.basePriceCents} currency={template.currency} prefix="From" />
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Price for this design at its standard size, before shipping and tax. Your final price depends on
            the size and options you choose.
          </p>

          <section aria-labelledby="designs-heading" className="mt-8 border-t border-line pt-6">
            <h2 id="designs-heading" className="font-sans text-base font-medium tracking-normal">
              Starting design
            </h2>
            <ul className="mt-3 space-y-2">
              {product.templates.map((t) => {
                const selected = t.code === template.code;
                return (
                  <li key={t.code}>
                    <Link
                      href={href(t.code, finish?.code)}
                      scroll={false}
                      aria-current={selected ? "true" : undefined}
                      className={`flex items-center gap-4 rounded-panel border p-3 ${
                        selected ? "border-ink bg-surface" : "border-line hover:border-ink"
                      }`}
                    >
                      <span className="block w-20 shrink-0" aria-hidden="true">
                        <Elevation
                          layout={t.layout}
                          widthUm={t.widthUm}
                          heightUm={t.heightUm}
                          finishHex={finish?.swatchHex ?? "#C7CEC6"}
                          label=""
                          className="w-full"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t.name}</span>
                        <span className="block text-sm text-ink-soft">{formatDimensions({ widthUm: t.widthUm, heightUm: t.heightUm, depthUm: t.depthUm })}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <Price cents={t.basePriceCents} currency={t.currency} />
                        {selected ? <span className="block text-sm text-ink-soft">Selected</span> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {product.finishes.length > 0 ? (
            <section aria-labelledby="finish-heading" className="mt-8 border-t border-line pt-6">
              <h2 id="finish-heading" className="font-sans text-base font-medium tracking-normal">
                Finish{finish ? <span className="font-normal text-ink-soft">: {finish.name}, {finish.materialName.toLowerCase()}</span> : null}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {product.finishes.map((f) => {
                  const selected = f.code === finish?.code;
                  return (
                    <li key={f.code}>
                      <Link
                        href={href(template.code, f.code)}
                        scroll={false}
                        aria-current={selected ? "true" : undefined}
                        className={`flex min-h-11 items-center gap-2 rounded-full border py-1 pl-1.5 pr-4 text-[0.95rem] ${
                          selected ? "border-ink bg-surface" : "border-line hover:border-ink"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="size-7 rounded-full border border-ink/25"
                          style={{ backgroundColor: f.swatchHex }}
                        />
                        {f.name}
                        {selected ? <span className="sr-only"> (selected)</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="next-heading" className="mt-8 rounded-panel bg-ink p-6 text-paper">
            <h2 id="next-heading" className="text-xl">
              Next step: configure it
            </h2>
            <p className="mt-2 text-paper/80">
              The configurator, where you set the exact width, rearrange bays and see a live price, is still
              being built. Ordering opens once it is ready.
            </p>
            <ButtonLink href="/how-it-works" variant="secondary" className="mt-4 border-paper/70 text-paper hover:bg-paper hover:text-ink">
              See how configuring will work
            </ButtonLink>
          </section>
        </div>
      </div>

      <div className="border-t border-line bg-surface">
        <div className="page grid gap-x-16 gap-y-12 py-14 *:min-w-0 lg:grid-cols-2">
          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-2xl">
              About this piece
            </h2>
            <p className="mt-4 max-w-prose text-ink-soft">{product.longDescription}</p>
            {product.keyFeatures.length > 0 ? (
              <ul className="mt-5 space-y-2">
                {product.keyFeatures.map((feature) => (
                  <li key={feature} className="border-l-2 border-spruce pl-3">
                    {feature}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section aria-labelledby="dimensions-heading">
            <h2 id="dimensions-heading" className="text-2xl">
              Dimensions
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-[0.95rem]">
                <caption className="sr-only">Standard size and available widths for each design</caption>
                <thead>
                  <tr className="border-b border-line text-ink-soft">
                    <th scope="col" className="py-2 pr-4 font-medium">Design</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Standard size</th>
                    <th scope="col" className="py-2 font-medium">Available widths</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {product.templates.map((t) => (
                    <tr key={t.code} className="border-b border-line-soft align-top">
                      <th scope="row" className="py-3 pr-4 font-medium">{t.name.split(":")[0]}</th>
                      <td className="py-3 pr-4">
                        {formatDimensions({ widthUm: t.widthUm, heightUm: t.heightUm, depthUm: t.depthUm })}
                        <span className="block text-sm text-ink-soft">
                          {formatDimensions({ widthUm: t.widthUm, heightUm: t.heightUm, depthUm: t.depthUm }, "cm")}
                        </span>
                      </td>
                      <td className="py-3">
                        {allowedWidths(t).map((w) => formatLength(w)).join(", ")}
                        <span className="block text-sm text-ink-soft">{formatLength(t.widthIncrementUm)} steps</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              Selected: {template.name.split(":")[0]}, {formatDimensions(size)}. Width is the only
              dimension you can change, and only to the widths listed. Height and depth are fixed for each
              design.
            </p>
          </section>

          <section aria-labelledby="included-heading">
            <h2 id="included-heading" className="text-2xl">
              What is included
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              {product.whatsIncluded.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="change-heading">
            <h2 id="change-heading" className="text-2xl">
              What you can change
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              {product.whatCanChange.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="materials-heading">
            <h2 id="materials-heading" className="text-2xl">
              Materials and finishes
            </h2>
            <dl className="mt-4 space-y-3">
              {[...materialsByName.entries()].map(([material, list]) => (
                <div key={material}>
                  <dt className="font-medium">{material}</dt>
                  <dd className="text-ink-soft">{list.map((f) => f.name).join(", ")}</dd>
                </div>
              ))}
            </dl>
            <ButtonLink href="/materials" variant="quiet" className="mt-2">
              About our materials and finishes
            </ButtonLink>
          </section>

          <section aria-labelledby="assembly-heading">
            <h2 id="assembly-heading" className="text-2xl">
              Assembly and delivery
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              {product.assemblyDifficulty ? (
                <div>
                  <dt className="text-sm text-ink-soft">Difficulty</dt>
                  <dd className="text-lg">{difficultyLabel[product.assemblyDifficulty]}</dd>
                </div>
              ) : null}
              {product.assemblyMinutes ? (
                <div>
                  <dt className="text-sm text-ink-soft">Estimated time</dt>
                  <dd className="text-lg">About {formatMinutes(product.assemblyMinutes)}</dd>
                </div>
              ) : null}
              {product.leadTimeNote ? (
                <div className="col-span-2">
                  <dt className="text-sm text-ink-soft">Lead time</dt>
                  <dd className="text-lg">{product.leadTimeNote}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-4 text-ink-soft">
              Delivered flat-packed with every part labeled.
              {product.isSample ? " Assembly figures are sample estimates and have not been tested." : ""}
            </p>
            <ButtonLink href="/delivery-assembly" variant="quiet" className="mt-2">
              How delivery and assembly work
            </ButtonLink>
          </section>
        </div>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="page py-14 sm:py-20">
          <h2 id="related-heading" className="mb-8 text-title">
            Goes with {product.name}
          </h2>
          <ProductGrid products={related} />
        </section>
      ) : null}
    </>
  );
}
