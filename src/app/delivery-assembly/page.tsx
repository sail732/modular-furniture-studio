import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Delivery and assembly",
  description: "How your furniture is packed, what arrives, and what assembly involves.",
  alternates: { canonical: "/delivery-assembly" },
};

export default function DeliveryAssemblyPage() {
  return (
    <>
      <PageHeader
        title="Delivery and assembly"
        intro="Furniture ships flat-packed as labeled parts, with the hardware and instructions for your layout."
      />
      <div className="page py-12 sm:py-16">
        <div className="prose-block">
          <h2 className="!mt-0">What arrives</h2>
          <ul>
            <li>Panels, doors and drawer parts, each with a label showing its part code.</li>
            <li>A hardware pack with the connectors, hinges and runners for your configuration.</li>
            <li>An assembly guide that follows the arrangement you ordered.</li>
          </ul>
          <h2>Assembly</h2>
          <p>
            Each product page gives a difficulty rating and a time estimate. Larger pieces, such as
            wardrobes and wall-hung units, are easier and safer with two people.
          </p>
          <h2>Shipping costs and delivery times</h2>
          <p>
            These have not been set. When ordering opens, shipping options and their cost will be shown at
            checkout before you pay.
          </p>
          <h2>Wall-mounted pieces</h2>
          <p>
            Wall fixings depend on your wall type and are not included. Fixing and load guidance will be
            published with each wall-mounted product before it goes on sale.
          </p>
        </div>
      </div>
    </>
  );
}
