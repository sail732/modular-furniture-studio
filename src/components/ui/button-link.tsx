import Link from "next/link";
import type { ComponentProps } from "react";

const base =
  "inline-flex min-h-11 items-center justify-center rounded-control px-5 text-[0.95rem] font-medium transition-colors";
const variants = {
  primary: "bg-spruce text-white hover:bg-spruce-deep",
  secondary: "border border-ink/70 text-ink hover:bg-ink hover:text-paper",
  quiet: "px-0 text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink",
};

export function buttonClass(variant: keyof typeof variants = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof variants }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
