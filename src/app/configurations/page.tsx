import type { Metadata } from "next";
import Link from "next/link";
import { Elevation } from "@/components/furniture/elevation";
import { ButtonLink } from "@/components/ui/button-link";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { formatDimensions } from "@/lib/units";
import { loadEngineCatalog, type EngineCatalog } from "@/server/configuration/catalog";
import { describeSelection } from "@/server/configuration/preview";
import { listOwnedConfigurations } from "@/server/configuration/store";
import { getDb } from "@/server/db/client";
import { readSessionId } from "@/server/http";

export const metadata: Metadata = { title: "Saved designs", robots: { index: false } };

export default async function SavedDesignsPage() {
  const sessionId = await readSessionId();
  const db = await getDb();
  const saved = sessionId ? await listOwnedConfigurations(db, sessionId) : [];
  const engines = new Map<string, EngineCatalog | null>();
  for (const slug of new Set(saved.map((s) => s.productSlug))) engines.set(slug, await loadEngineCatalog(db, slug));

  return (
    <>
      <PageHeader title="Saved designs" intro="Designs you have saved in this browser. Accounts are not available yet, so they are not visible on your other devices." />
      <div className="page py-10 sm:py-14">
        {saved.length === 0 ? (
          <StateMessage title="No saved designs yet" actions={<ButtonLink href="/shop">Browse furniture to configure</ButtonLink>}>
            <p>Open a product, choose Configure, and save your design from the Review step.</p>
          </StateMessage>
        ) : (
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((config) => {
              const engine = engines.get(config.productSlug);
              const view = engine ? describeSelection(engine.catalog, config.selection) : null;
              return (
                <li key={config.id}>
                  <article className="group relative">
                    <div className="aspect-[4/3] overflow-hidden rounded-panel bg-surface ring-1 ring-line-soft group-hover:shadow-lift">
                      {view ? (
                        <Elevation
                          layout={view.layout}
                          widthUm={config.widthUm}
                          heightUm={config.heightUm}
                          finishHex={view.finishHex}
                          label={config.name}
                          className="size-full"
                        />
                      ) : null}
                    </div>
                    <h2 className="mt-4 text-xl leading-tight">
                      <Link href={`/configurations/${config.id}`} className="after:absolute after:inset-0">
                        {config.name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      {config.productName}. {formatDimensions(config)}
                      {view ? `. ${view.finishName}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Saved{" "}
                      <time dateTime={config.updatedAt.toISOString()}>
                        {config.updatedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </time>
                    </p>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
