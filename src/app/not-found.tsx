import type { Metadata } from "next";
import { NotFoundMessage } from "@/components/not-found-message";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = { title: "Page not found" };

// Unmatched URLs render outside the (site) layout, so bring the shell along.
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundMessage />
    </SiteShell>
  );
}
