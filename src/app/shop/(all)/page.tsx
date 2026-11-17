import type { Metadata } from "next";
import { ListingView } from "@/components/catalog/listing-view";
import type { RawSearchParams } from "@/server/catalog/filters";

export const metadata: Metadata = {
  title: "All furniture",
  description: "Browse every configurable design: consoles, shelving, wardrobes, desks and sideboards.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <ListingView searchParams={await searchParams} />;
}
