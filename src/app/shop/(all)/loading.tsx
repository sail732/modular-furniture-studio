export default function Loading() {
  return (
    <div className="page py-10 sm:py-14" role="status" aria-label="Loading furniture">
      <div className="skeleton h-10 w-72 max-w-full" />
      <div className="skeleton mt-8 h-10 w-full max-w-xl" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
        <div className="skeleton hidden h-96 lg:block" />
        <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <div className="skeleton aspect-[4/3]" />
              <div className="skeleton mt-4 h-6 w-2/3" />
              <div className="skeleton mt-2 h-4 w-1/3" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
