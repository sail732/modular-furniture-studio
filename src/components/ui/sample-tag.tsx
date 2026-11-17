/** Marks content that is sample/placeholder data, in words rather than colour alone. */
export function SampleTag({ children = "Sample" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-panel bg-signal px-1.5 py-0.5 text-xs font-medium text-ink">
      {children}
    </span>
  );
}
