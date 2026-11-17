import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Configurator } from "@/components/configurator/configurator";
import { loadEngineCatalog } from "@/server/configuration/catalog";
import { getOwnedConfiguration } from "@/server/configuration/store";
import { getDb } from "@/server/db/client";
import { isUuid, readSessionId, requestOrigin } from "@/server/http";

export const metadata: Metadata = { title: "Saved design", robots: { index: false } };

export default async function SavedConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = await readSessionId();
  if (!isUuid(id) || !sessionId) notFound();
  const db = await getDb();
  const saved = await getOwnedConfiguration(db, id, sessionId);
  if (!saved) notFound();
  const engine = await loadEngineCatalog(db, saved.productSlug);
  if (!engine) notFound();
  const template = engine.catalog.templates.find((t) => t.code === saved.selection.templateCode);

  return (
    <Configurator
      key={saved.id}
      catalog={engine.catalog}
      initialSelection={saved.selection}
      origin={await requestOrigin()}
      saved={{
        id: saved.id,
        shareToken: saved.shareToken,
        name: saved.name,
        savedUnderOlderRules:
          saved.ruleSetVersion !== engine.catalog.ruleSetVersion || saved.templateVersion !== (template?.version ?? -1),
      }}
    />
  );
}
