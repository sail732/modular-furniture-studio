export function Section({
  title,
  intro,
  action,
  children,
  id,
  className = "",
}: {
  title: string;
  intro?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={`page py-14 sm:py-20 ${className}`}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 sm:mb-10">
        <div className="max-w-2xl">
          <h2 id={headingId} className="text-title">
            {title}
          </h2>
          {intro ? <p className="mt-3 text-lg text-ink-soft">{intro}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
