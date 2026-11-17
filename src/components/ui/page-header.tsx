export function PageHeader({ title, intro }: { title: string; intro?: React.ReactNode }) {
  return (
    <header className="page border-b border-line py-12 sm:py-16">
      <h1 className="max-w-3xl text-title">{title}</h1>
      {intro ? <p className="mt-4 max-w-2xl text-lg text-ink-soft sm:text-xl">{intro}</p> : null}
    </header>
  );
}
