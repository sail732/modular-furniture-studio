import { z } from "zod";
import { inchesToUm } from "@/lib/units";

export const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "newest", label: "Newest" },
] as const;
export type SortOption = (typeof sortOptions)[number]["value"];

/** Whole-dollar price bands offered in the UI. Any "min-max" value parses. */
export const priceBands = [
  { value: "0-500", label: "Under $500" },
  { value: "500-1000", label: "$500 to $1,000" },
  { value: "1000-1500", label: "$1,000 to $1,500" },
  { value: "1500-", label: "$1,500 and over" },
] as const;

/** Whole-inch width bands offered in the UI. */
export const widthBands = [
  { value: "0-48", label: "Up to 48″ wide" },
  { value: "48-72", label: "48″ to 72″" },
  { value: "72-96", label: "72″ to 96″" },
  { value: "96-", label: "96″ and wider" },
] as const;

export interface ListingFilters {
  q: string;
  categorySlug: string | null;
  materialCodes: string[];
  finishCodes: string[];
  price: { minCents: number | null; maxCents: number | null; raw: string } | null;
  width: { minUm: number | null; maxUm: number | null; raw: string } | null;
  sort: SortOption;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const many = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

const codeSchema = z.string().regex(/^[A-Z0-9-]{1,40}$/);
const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);
const rangeSchema = z.string().regex(/^\d{0,6}-\d{0,6}$/);
const sortSchema = z.enum(sortOptions.map((o) => o.value) as [SortOption, ...SortOption[]]);

function parseRange(raw: string | undefined): { min: number | null; max: number | null; raw: string } | null {
  if (!raw || !rangeSchema.safeParse(raw).success) return null;
  const [lo, hi] = raw.split("-");
  const min = lo === "" ? null : Number(lo);
  const max = hi === "" ? null : Number(hi);
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min > max) return null;
  return { min, max, raw };
}

/**
 * Turn untrusted URL parameters into a validated filter object.
 * Unknown or malformed values are dropped rather than passed to the database.
 */
export function parseListingParams(params: RawSearchParams, categorySlug?: string): ListingFilters {
  const q = (first(params.q) ?? "").trim().slice(0, 80);
  const category = categorySlug ?? first(params.category);
  const price = parseRange(first(params.price));
  const width = parseRange(first(params.width));
  const sort = sortSchema.safeParse(first(params.sort));
  const unique = (values: string[]) =>
    [...new Set(values.filter((v) => codeSchema.safeParse(v).success))].slice(0, 20);

  return {
    q,
    categorySlug: category && slugSchema.safeParse(category).success ? category : null,
    materialCodes: unique(many(params.material)),
    finishCodes: unique(many(params.finish)),
    price: price && {
      minCents: price.min === null ? null : price.min * 100,
      maxCents: price.max === null ? null : price.max * 100,
      raw: price.raw,
    },
    width: width && {
      minUm: width.min === null ? null : inchesToUm(width.min),
      maxUm: width.max === null ? null : inchesToUm(width.max),
      raw: width.raw,
    },
    sort: sort.success ? sort.data : "featured",
  };
}

export function hasActiveFilters(f: ListingFilters): boolean {
  return (
    f.q !== "" || f.materialCodes.length > 0 || f.finishCodes.length > 0 || f.price !== null || f.width !== null
  );
}
