import { formatMoney } from "@/lib/money";

export function Price({
  cents,
  currency,
  prefix,
  className = "",
}: {
  cents: number;
  currency: string;
  prefix?: string;
  className?: string;
}) {
  return (
    <span className={`tabular-nums ${className}`}>
      {prefix ? <span className="text-ink-soft">{prefix} </span> : null}
      {formatMoney(cents, currency)}
    </span>
  );
}
