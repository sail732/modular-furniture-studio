"use client";

import { useId, useState } from "react";

/** Collapsible on small screens, always open from the lg breakpoint. */
export function FilterDisclosure({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-11 w-full items-center justify-between rounded-control border border-ink/60 px-4 font-medium lg:hidden"
      >
        <span>
          Filter and sort{activeCount > 0 ? ` (${activeCount} active)` : ""}
        </span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div id={id} className={`${open ? "mt-5 block" : "hidden"} lg:mt-0 lg:block`}>
        {children}
      </div>
    </div>
  );
}
