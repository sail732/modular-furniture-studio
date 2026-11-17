import { siteConfig } from "@/config/site";

export function SampleNotice() {
  if (!siteConfig.catalogIsSample) return null;
  return (
    <p role="note" className="bg-signal px-4 py-2 text-center text-sm text-ink">
      Preview build. Products, prices and sizes are sample content, and ordering is not open yet.
    </p>
  );
}
