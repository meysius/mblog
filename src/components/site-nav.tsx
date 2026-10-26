"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isInternal, type NavLink } from "@/lib/site-settings";

const linkClass =
  "rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:text-foreground";

export function SiteNav({ links }: { links: NavLink[] }) {
  return <SiteNavLinks links={links} pathname={usePathname()} />;
}

/**
 * The header's links, with the current page's marked. Without a pathname none is:
 * a page that renders on its first visit learns its pathname only in the browser.
 */
export function SiteNavLinks({ links, pathname }: { links: NavLink[]; pathname?: string }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1">
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
