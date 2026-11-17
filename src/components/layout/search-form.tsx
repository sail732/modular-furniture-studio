export function SearchForm({ idSuffix, defaultValue = "" }: { idSuffix: string; defaultValue?: string }) {
  const id = `site-search-${idSuffix}`;
  return (
    <form action="/shop" method="get" role="search" className="flex items-stretch">
      <label htmlFor={id} className="sr-only">
        Search furniture
      </label>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search furniture"
        maxLength={80}
        className="min-h-11 w-full min-w-0 rounded-l-control border border-r-0 border-ink/60 bg-surface px-3 placeholder:text-ink-soft"
      />
      <button
        type="submit"
        className="min-h-11 rounded-r-control border border-ink/60 bg-ink px-4 text-[0.95rem] font-medium text-paper hover:bg-spruce-deep"
      >
        Search
      </button>
    </form>
  );
}
