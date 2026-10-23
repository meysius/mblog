import { NotFoundMessage } from "@/components/not-found-message";
import { SiteShell } from "@/components/site-shell";

// Unmatched URLs render outside the (site) layout, so bring the shell along.
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundMessage />
    </SiteShell>
  );
}
