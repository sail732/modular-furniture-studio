import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { policyPages } from "@/config/policies";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const policy = policyPages.find((p) => p.slug === slug);
  return policy
    ? { title: `${policy.title} (draft)`, robots: { index: false }, alternates: { canonical: `/legal/${slug}` } }
    : { title: "Page not found" };
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const policy = policyPages.find((p) => p.slug === slug);
  if (!policy) notFound();
  return (
    <>
      <PageHeader title={policy.title} />
      <div className="page py-12 sm:py-16">
        <div role="note" className="max-w-2xl rounded-panel border-l-4 border-signal bg-surface p-5">
          <p className="font-medium">Draft: not yet written or legally reviewed</p>
          <p className="mt-2 text-ink-soft">
            This page will set out {policy.covers}. It has no effect until the final text is published, and
            no orders can be placed before then.
          </p>
        </div>
      </div>
    </>
  );
}
