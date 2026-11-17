import type { FinishSummary } from "@/server/catalog/queries";

/** Compact, non-interactive preview of available finishes. */
export function FinishDots({ finishes, max = 5 }: { finishes: FinishSummary[]; max?: number }) {
  if (finishes.length === 0) return null;
  const shown = finishes.slice(0, max);
  const rest = finishes.length - shown.length;
  return (
    <div className="flex items-center gap-1.5">
      <span className="sr-only">
        {finishes.length} {finishes.length === 1 ? "finish" : "finishes"}: {finishes.map((f) => f.name).join(", ")}
      </span>
      {shown.map((f) => (
        <span
          key={f.code}
          aria-hidden="true"
          className="size-4 rounded-full border border-ink/25"
          style={{ backgroundColor: f.swatchHex }}
        />
      ))}
      {rest > 0 ? (
        <span aria-hidden="true" className="text-sm text-ink-soft">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
