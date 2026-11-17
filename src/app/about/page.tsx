import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button-link";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description: `What ${siteConfig.name} makes and why it is built from standard parts.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title={`About ${siteConfig.name}`}
        intro="We make configurable furniture from a library of standard parts, so you can fit a piece to your room without commissioning a one-off."
      />
      <div className="page py-12 sm:py-16">
        <div className="prose-block">
          <h2 className="!mt-0">The idea</h2>
          <p>
            Made-to-measure furniture usually means a designer, a workshop and a long wait. Off-the-shelf
            furniture means taking the size you are given. We sit between the two: worked-out designs that
            you can resize and rearrange within limits, built from parts that are the same every time.
          </p>
          <h2>Where we are</h2>
          <p>
            The catalog on this site is a preview with sample products. Details about the company, where
            the furniture is made and who makes it will be added here before launch.
          </p>
        </div>
        <ButtonLink href="/contact" variant="secondary" className="mt-10">
          Contact and FAQ
        </ButtonLink>
      </div>
    </>
  );
}
