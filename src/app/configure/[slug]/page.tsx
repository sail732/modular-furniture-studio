import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Configurator } from "@/components/configurator/configurator";
import { defaultSelection } from "@/lib/configuration/selection";
import { loadEngineCatalog } from "@/server/configuration/catalog";
import { getSharedConfiguration } from "@/server/configuration/store";
import { getDb } from "@/server/db/client";
import { requestOrigin } from "@/server/http";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const engine = await loadEngineCatalog(await getDb(), slug);
  if (!engine) return { title: "Product not found" };
  return {
    title: `Configure ${engine.catalog.product.name}`,
    description: `Set the width, layout, finish and details of your ${engine.catalog.product.name}.`,
    alternates: { canonical: `/configure/${slug}` },
    robots: { index: false },
  };
}

export default async function ConfigurePage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const db = await getDb();
  const engine = await loadEngineCatalog(db, slug);
  if (!engine) notFound();
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  // Start from a shared design when asked, otherwise from the chosen template.
  let initial = defaultSelection(engine.catalog, pick(query.design) ?? "", pick(query.finish));
  const from = pick(query.from);
  if (from && /^[A-Za-z0-9_-]{16,64}$/.test(from)) {
    const shared = await getSharedConfiguration(db, from);
    if (shared && shared.productSlug === slug) initial = shared.selection;
  }

  return <Configurator catalog={engine.catalog} initialSelection={initial} origin={await requestOrigin()} />;
}
