import Link from "next/link";
import { buttonClass } from "@/components/ui/button-link";
import {
  priceBands,
  sortOptions,
  widthBands,
  type ListingFilters,
} from "@/server/catalog/filters";
import type { MaterialWithFinishes } from "@/server/catalog/queries";

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line-soft pt-5">
      <legend className="float-left mb-3 w-full font-medium">{legend}</legend>
      <div className="clear-both space-y-1">{children}</div>
    </fieldset>
  );
}

function Choice({
  type,
  name,
  value,
  checked,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-3">
      <input type={type} name={name} value={value} defaultChecked={checked} className="size-4 accent-spruce" />
      <span className="flex items-center gap-2">{children}</span>
    </label>
  );
}

/**
 * Plain GET form: works without JavaScript, and every filter state is a URL
 * that can be shared or bookmarked. The server validates all values.
 */
export function FilterForm({
  action,
  filters,
  materials,
}: {
  action: string;
  filters: ListingFilters;
  materials: MaterialWithFinishes[];
}) {
  return (
    <form action={action} method="get" className="space-y-6" aria-label="Filter and sort furniture">
      <div>
        <label htmlFor="filter-q" className="mb-2 block font-medium">
          Search
        </label>
        <input
          id="filter-q"
          name="q"
          type="search"
          defaultValue={filters.q}
          maxLength={80}
          placeholder="Name or description"
          className="min-h-11 w-full rounded-control border border-ink/60 bg-surface px-3 placeholder:text-ink-soft"
        />
      </div>
      <div>
        <label htmlFor="filter-sort" className="mb-2 block font-medium">
          Sort by
        </label>
        <select
          id="filter-sort"
          name="sort"
          defaultValue={filters.sort}
          className="min-h-11 w-full rounded-control border border-ink/60 bg-surface px-3"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <Group legend="Starting price">
        <Choice type="radio" name="price" value="" checked={filters.price === null}>
          Any price
        </Choice>
        {priceBands.map((band) => (
          <Choice key={band.value} type="radio" name="price" value={band.value} checked={filters.price?.raw === band.value}>
            {band.label}
          </Choice>
        ))}
      </Group>

      <Group legend="Width">
        <Choice type="radio" name="width" value="" checked={filters.width === null}>
          Any width
        </Choice>
        {widthBands.map((band) => (
          <Choice key={band.value} type="radio" name="width" value={band.value} checked={filters.width?.raw === band.value}>
            {band.label}
          </Choice>
        ))}
      </Group>

      {materials.length > 0 ? (
        <Group legend="Material">
          {materials.map((m) => (
            <Choice key={m.code} type="checkbox" name="material" value={m.code} checked={filters.materialCodes.includes(m.code)}>
              {m.name}
            </Choice>
          ))}
        </Group>
      ) : null}

      {materials.length > 0 ? (
        <Group legend="Finish">
          {materials.flatMap((m) =>
            m.finishes.map((f) => (
              <Choice key={f.code} type="checkbox" name="finish" value={f.code} checked={filters.finishCodes.includes(f.code)}>
                <span
                  aria-hidden="true"
                  className="size-4 rounded-full border border-ink/25"
                  style={{ backgroundColor: f.swatchHex }}
                />
                {f.name}
              </Choice>
            )),
          )}
        </Group>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 border-t border-line-soft pt-5">
        <button type="submit" className={buttonClass("primary")}>
          Apply filters
        </button>
        <Link href={action} className={buttonClass("quiet")}>
          Clear filters
        </Link>
      </div>
    </form>
  );
}
