"use client";

import { useEffect } from "react";
import { buttonClass, ButtonLink } from "@/components/ui/button-link";
import { StateMessage } from "@/components/ui/state-message";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : "";
  return (
    <div className="page py-20">
      <StateMessage
        tone="error"
        title="This page could not be loaded"
        actions={
          <>
            <button type="button" onClick={() => retry()} className={buttonClass("primary")}>
              Try again
            </button>
            <ButtonLink href="/" variant="secondary">
              Go to the homepage
            </ButtonLink>
          </>
        }
      >
        <p>
          The catalog did not respond. Try again in a moment.
          {digest ? ` Reference: ${digest}` : ""}
        </p>
      </StateMessage>
    </div>
  );
}
