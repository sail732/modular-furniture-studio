import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";
import { StateMessage } from "@/components/ui/state-message";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="page py-20">
      <StateMessage
        title="Page not found"
        actions={
          <>
            <ButtonLink href="/shop">Browse all furniture</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Go to the homepage
            </ButtonLink>
          </>
        }
      >
        <p>The page may have moved, or the product may no longer be available.</p>
      </StateMessage>
    </div>
  );
}
