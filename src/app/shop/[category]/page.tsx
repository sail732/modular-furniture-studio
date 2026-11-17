import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingView } from "@/components/catalog/listing-view";
import { getDb } from "@/server/db/client";
import type { RawSearchParams } from "@/server/catalog/filters";
import { getCategoryBySlug } from "@/server/catalog/queries";

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(await getDb(), slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/shop/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(await getDb(), slug);
  if (!category) notFound();
  return <ListingView searchParams={await searchParams} category={category} />;
}
