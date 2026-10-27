"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isInternal, type NavLink } from "@/lib/site-settings";

// The current page's link sits in a pill; the border is there on the others too, unseen,
// so marking one doesn't shift its neighbors.
const linkClass =
  "block rounded-[0.625rem] border border-transparent px-2.5 py-1 font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:border-border aria-[current=page]:text-foreground";

export function SiteNav({ links }: { links: NavLink[] }) {
  return <SiteNavLinks links={links} pathname={usePathname()} />;
}

/**
 * The header's links, with the current page's marked. Without a pathname none is:
 * a page that renders on its first visit learns its pathname only in the browser.
 */
export function SiteNavLinks({ links, pathname }: { links: NavLink[]; pathname?: string }) {
  return (
    <ul className="-mr-2.5 flex flex-wrap justify-end gap-x-1 gap-y-1 text-sm">
      {links.map(({ label, url }, i) => (
        <li key={i}>
          {isInternal(url) ? (
            <Link
              href={url}
              aria-current={url === pathname ? "page" : undefined}
              className={linkClass}
            >
              {label}
            </Link>
          ) : (
            <a href={url} className={linkClass}>
              {label}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
