/** Shared empty / error / notice block. */
export function StateMessage({
  title,
  children,
  actions,
  tone = "neutral",
}: {
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-panel border border-dashed px-6 py-10 text-center ${
        tone === "error" ? "border-danger/60" : "border-line"
      }`}
    >
      <h2 className="text-xl">{title}</h2>
      {children ? <div className="mx-auto mt-2 max-w-md text-ink-soft">{children}</div> : null}
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
