import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";
import { PageHeader } from "@/components/ui/page-header";
import { SampleTag } from "@/components/ui/sample-tag";
import { StateMessage } from "@/components/ui/state-message";
import { getDb } from "@/server/db/client";
import { listMaterialsWithFinishes } from "@/server/catalog/queries";

export const metadata: Metadata = {
  title: "Materials and finishes",
  description: "The panel materials we build with and the finishes available for each.",
  alternates: { canonical: "/materials" },
};

export default async function MaterialsPage() {
  const materials = await listMaterialsWithFinishes(await getDb());
  return (
    <>
      <PageHeader
        title="Materials and finishes"
        intro="Each finish belongs to one material. A product page lists only the finishes that piece can be made in."
      />
      <div className="page py-12 sm:py-16">
        {materials.length === 0 ? (
          <StateMessage title="No materials published yet" />
        ) : (
          <ul className="space-y-14">
            {materials.map((material) => (
              <li key={material.code} className="grid gap-6 border-t border-line pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
                <div>
                  <h2 className="text-2xl">{material.name}</h2>
                  {material.isSample ? (
                    <p className="mt-2">
                      <SampleTag>Sample material</SampleTag>
                    </p>
                  ) : null}
                  <p className="mt-3 max-w-prose text-ink-soft">{material.description}</p>
                  <ButtonLink href={`/shop?material=${material.code}`} variant="quiet" className="mt-2">
                    Furniture in {material.name.toLowerCase()}
                  </ButtonLink>
                </div>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {material.finishes.map((finish) => (
                    <li key={finish.code}>
                      <div
                        className="aspect-square rounded-panel ring-1 ring-ink/15"
                        style={{ backgroundColor: finish.swatchHex }}
                        aria-hidden="true"
                      />
                      <p className="mt-2 font-medium">{finish.name}</p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-14 max-w-prose text-sm text-ink-soft">
          Swatches are flat screen colours that approximate each finish. They do not show grain, sheen or
          texture, and they vary between displays.
        </p>
      </div>
    </>
  );
}
