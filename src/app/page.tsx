import Link from "next/link";
import { ProductGrid } from "@/components/catalog/product-card";
import { Elevation } from "@/components/furniture/elevation";
import { ButtonLink } from "@/components/ui/button-link";
import { Section } from "@/components/ui/section";
import { StateMessage } from "@/components/ui/state-message";
import { howItWorksSteps } from "@/config/content";
import { formatDimensions } from "@/lib/units";
import { getDb } from "@/server/db/client";
import {
  getProductBySlug,
  listCategories,
  listFeaturedProducts,
  listMaterialsWithFinishes,
  listProducts,
} from "@/server/catalog/queries";

export default async function HomePage() {
  const db = await getDb();
  const [categories, featured, all, materials] = await Promise.all([
    listCategories(db),
    listFeaturedProducts(db, 4),
    listProducts(db),
    listMaterialsWithFinishes(db),
  ]);

  const hero = featured[0] ?? all[0];
  const heroTemplate = hero?.primaryTemplate;
  const heroFinish = hero?.finishes[0];
  const shownCategories = categories.filter((c) => c.productCount > 0);
  // A product with more than one design illustrates growing a piece over time.
  const growth = all.find((p) => p.templateCount >= 2 && p.slug !== hero?.slug) ?? hero;
  const growthDetail = growth ? await getProductBySlug(db, growth.slug) : null;

  return (
    <>
      <section className="border-b border-line">
        <div className="page grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:py-20">
          <div>
            <h1 className="text-display font-semibold">Furniture built bay by bay</h1>
            <p className="mt-6 max-w-md text-lg text-ink-soft sm:text-xl">
              Choose a design, set its width and pick a finish. It arrives flat-packed with every part
              labeled, ready to assemble.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/shop">Explore collections</ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
          </div>
          {hero && heroTemplate ? (
            <figure>
              <Elevation
                layout={heroTemplate.layout}
                widthUm={heroTemplate.widthUm}
                heightUm={heroTemplate.heightUm}
                finishHex={heroFinish?.swatchHex ?? "#C7CEC6"}
                label={`${hero.name}, ${heroTemplate.name}`}
                showDimensions
                animate
                className="w-full"
              />
              <figcaption className="mt-2 text-sm text-ink-soft">
                <Link href={`/products/${hero.slug}`} className="underline underline-offset-4">
                  {hero.name}
                </Link>
                , {formatDimensions({ widthUm: heroTemplate.widthUm, heightUm: heroTemplate.heightUm, depthUm: heroTemplate.depthUm })}. Front-view illustration.
              </figcaption>
            </figure>
          ) : null}
        </div>
      </section>

      {shownCategories.length > 0 ? (
        <Section
          id="categories"
          title="Shop by room and use"
          action={
            <ButtonLink href="/shop" variant="quiet">
              View all furniture
            </ButtonLink>
          }
        >
          <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-6">
            {shownCategories.map((category, i) => {
              const sample = all.find((p) => p.category.slug === category.slug);
              return (
                <li key={category.slug} className={i < 2 ? "lg:col-span-3" : "lg:col-span-2"}>
                  <Link
                    href={`/shop/${category.slug}`}
                    className="group flex h-full flex-col rounded-panel bg-surface p-4 ring-1 ring-line-soft hover:ring-ink sm:p-6"
                  >
                    {sample ? (
                      <span aria-hidden="true" className={`block ${i < 2 ? "mx-auto w-full max-w-sm" : ""}`}>
                        <Elevation
                          layout={sample.primaryTemplate.layout}
                          widthUm={sample.primaryTemplate.widthUm}
                          heightUm={sample.primaryTemplate.heightUm}
                          finishHex={sample.finishes[0]?.swatchHex ?? "#C7CEC6"}
                          label=""
                          className="w-full"
                        />
                      </span>
                    ) : null}
                    <span className="mt-4 block font-display text-lg font-medium leading-tight sm:text-xl">
                      {category.name}
                    </span>
                    <span className="mt-1 block text-sm text-ink-soft">
                      {category.productCount} {category.productCount === 1 ? "piece" : "pieces"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {featured.length > 0 ? (
        <div className="border-y border-line bg-surface">
          <Section id="featured" title="Featured designs" intro="Starting points you can resize and rearrange.">
            <ProductGrid products={featured} columns={4} />
          </Section>
        </div>
      ) : null}

      <Section id="how-it-works" title="How it works">
        <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorksSteps.map((step, i) => (
            <li key={step.title} className="border-t-2 border-ink pt-4">
              <span className="font-display text-4xl font-semibold tabular-nums text-spruce">{i + 1}</span>
              <h3 className="mt-3 text-xl">{step.title}</h3>
              <p className="mt-2 text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {growthDetail && growthDetail.templates.length >= 2 ? (
        <div className="bg-ink text-paper">
          <section aria-labelledby="modular-heading" className="page grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 id="modular-heading" className="text-title">
                One set of parts, many pieces
              </h2>
              <p className="mt-4 max-w-lg text-lg text-paper/80">
                Every design is assembled from the same panels, shelves, doors and drawer boxes. That is why
                a piece can be made wider, rearranged, or added to later instead of being replaced.
              </p>
              <ButtonLink
                href={`/products/${growthDetail.slug}`}
                variant="secondary"
                className="mt-6 border-paper/70 text-paper hover:bg-paper hover:text-ink"
              >
                See the {growthDetail.name}
              </ButtonLink>
            </div>
            <div className="grid grid-cols-[1fr_auto_1.6fr] items-end gap-3 rounded-panel bg-paper p-4 text-ink sm:p-6">
              {growthDetail.templates.slice(0, 2).map((t, i) => (
                <div key={t.code} className={`${i === 1 ? "col-start-3" : ""}`}>
                  <Elevation
                    layout={t.layout}
                    widthUm={t.widthUm}
                    heightUm={t.heightUm}
                    finishHex={growthDetail.finishes[0]?.swatchHex ?? "#C7CEC6"}
                    label={`${growthDetail.name}, ${t.name}`}
                    className="w-full"
                  />
                  <p className="mt-1 text-center text-sm text-ink-soft">{t.name.split(":")[0]}</p>
                </div>
              ))}
              <p aria-hidden="true" className="col-start-2 row-start-1 self-center font-display text-3xl text-spruce">
                +
              </p>
            </div>
          </section>
        </div>
      ) : null}

      {materials.length > 0 ? (
        <Section
          id="materials"
          title="Materials and finishes"
          intro="Finishes are matched to materials, so every option shown for a piece can be made."
          action={
            <ButtonLink href="/materials" variant="quiet">
              All materials and finishes
            </ButtonLink>
          }
        >
          <ul className="grid gap-8 sm:grid-cols-3">
            {materials.map((material) => (
              <li key={material.code}>
                <div className="flex h-24 overflow-hidden rounded-panel ring-1 ring-line">
                  {material.finishes.map((finish) => (
                    <span
                      key={finish.code}
                      className="flex-1"
                      style={{ backgroundColor: finish.swatchHex }}
                      title={finish.name}
                    />
                  ))}
                </div>
                <h3 className="mt-4 text-xl">{material.name}</h3>
                <p className="mt-1 text-ink-soft">{material.finishes.map((f) => f.name).join(", ")}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="border-y border-line bg-surface">
        <Section
          id="delivery"
          title="Delivered flat, labeled for assembly"
          action={
            <ButtonLink href="/delivery-assembly" variant="quiet">
              Delivery and assembly details
            </ButtonLink>
          }
        >
          <ul className="grid gap-8 sm:grid-cols-3">
            {[
              ["Every part has a code", "Panels, doors and drawer parts carry a label that matches your assembly guide."],
              ["Hardware for your layout", "The hardware pack contains the connectors, hinges and runners your configuration needs."],
              ["A guide for what you ordered", "Instructions follow the arrangement you chose, not a generic model."],
            ].map(([title, body]) => (
              <li key={title}>
                <h3 className="text-xl">{title}</h3>
                <p className="mt-2 text-ink-soft">{body}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section id="reviews" title="Customer reviews">
        <StateMessage title="No reviews yet">
          <p>Reviews will appear here once customers have received and assembled their furniture.</p>
        </StateMessage>
      </Section>
    </>
  );
}
