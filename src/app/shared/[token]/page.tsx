import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Elevation } from "@/components/furniture/elevation";
import { ButtonLink } from "@/components/ui/button-link";
import { baseLabels } from "@/lib/configuration/types";
import { formatDimensions, formatLength } from "@/lib/units";
import { loadEngineCatalog } from "@/server/configuration/catalog";
import { validateSelection } from "@/server/configuration/engine";
import { describeSelection } from "@/server/configuration/preview";
import { getSharedConfiguration } from "@/server/configuration/store";
import { getDb } from "@/server/db/client";

// Shared designs are reachable only by their link and are never indexed.
export const metadata: Metadata = { title: "Shared design", robots: { index: false, follow: false } };

export default async function SharedDesignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound();
  const db = await getDb();
  const shared = await getSharedConfiguration(db, token);
  if (!shared) notFound();
  const engine = await loadEngineCatalog(db, shared.productSlug);
  if (!engine) notFound();
  const view = describeSelection(engine.catalog, shared.selection);
  const stillValid = validateSelection(engine.catalog, engine.rules, shared.selection).valid;

  const rows: [string, string][] = [
    ["Piece", shared.productName],
    ["Design", shared.templateName],
    ["Size", formatDimensions(shared)],
    ["Bays", view.bays.map((b) => `${b.name} (${formatLength(b.widthUm)}${b.countText ? `, ${b.countText}` : ""})`).join("; ")],
    ["Finish", `${view.finishName}${view.materialName ? `, ${view.materialName.toLowerCase()}` : ""}`],
    ["Base", baseLabels[shared.selection.base]],
    ["Handles", view.handleName],
    ["Accessories", view.accessories.length ? view.accessories.map((a) => `${a.name} × ${a.quantity}`).join("; ") : "None"],
  ];

  return (
    <div className="page grid gap-8 py-10 *:min-w-0 sm:py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
      <figure>
        <div className="rounded-panel bg-surface ring-1 ring-line-soft">
          <Elevation
            layout={view.layout}
            widthUm={shared.widthUm}
            heightUm={shared.heightUm}
            finishHex={view.finishHex}
            label={`${shared.productName}, ${formatLength(shared.widthUm)} wide, in ${view.finishName}`}
            showDimensions
            className="w-full"
          />
        </div>
        <figcaption className="mt-2 text-sm text-ink-soft">2D front view, not a photograph. Screen colours are approximate.</figcaption>
      </figure>
      <div>
        <p className="text-sm text-ink-soft">Shared design, view only</p>
        <h1 className="mt-1 text-title">{shared.name}</h1>
        {!stillValid ? (
          <p role="note" className="mt-3 rounded-panel border-l-4 border-signal bg-surface p-3 text-[0.95rem]">
            Some options in this design are no longer available. You can still use it as a starting point and adjust it.
          </p>
        ) : null}
        <dl className="mt-5 divide-y divide-line-soft border-y border-line">
          {rows.map(([term, value]) => (
            <div key={term} className="grid grid-cols-[7rem_1fr] gap-3 py-2.5">
              <dt className="text-ink-soft">{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={`/configure/${shared.productSlug}?from=${token}`}>Start from this design</ButtonLink>
          <ButtonLink href={`/products/${shared.productSlug}`} variant="secondary">
            View the {shared.productName}
          </ButtonLink>
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          Starting from this design makes your own copy. The original cannot be changed from this link.
        </p>
      </div>
    </div>
  );
}
