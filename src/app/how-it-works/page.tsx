import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";
import { PageHeader } from "@/components/ui/page-header";
import { howItWorksSteps } from "@/config/content";

export const metadata: Metadata = {
  title: "How it works",
  description: "From choosing a starting design to assembling your furniture at home.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        title="How it works"
        intro="You start from a design that already works and change it within limits that keep it buildable."
      />
      <div className="page py-12 sm:py-16">
        <ol className="max-w-3xl space-y-10">
          {howItWorksSteps.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[3rem_1fr] gap-x-4 sm:grid-cols-[4.5rem_1fr]">
              <span className="font-display text-5xl font-semibold leading-none tabular-nums text-spruce sm:text-6xl">
                {i + 1}
              </span>
              <div className="border-t-2 border-ink pt-3">
                <h2 className="text-2xl">{step.title}</h2>
                <p className="mt-2 text-lg text-ink-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="prose-block mt-16">
          <h2>Why sizes move in steps</h2>
          <p>
            Each piece is assembled from a fixed library of panels, shelves, doors and drawer boxes. Widths
            change in steps because the parts do. In return, every combination offered is one that fits
            together, and a piece can be extended later with parts from the same library.
          </p>
          <h2>What is available today</h2>
          <p>
            You can browse designs, standard sizes, width ranges and finishes. The configurator, live pricing
            and ordering are still being built, so nothing can be purchased yet.
          </p>
        </div>
        <ButtonLink href="/shop" className="mt-10">
          Browse the designs
        </ButtonLink>
      </div>
    </>
  );
}
