"use client";

import { Files, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/admin", label: "Posts", icon: Files },
  { href: "/admin/tags", label: "Tags", icon: Tags },
];

// Posts is the dashboard's home, so only its own page counts; a section's subpages count too.
function isCurrent(href: string, pathname: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function SidebarNav() {
  return <SidebarLinks pathname={usePathname()} />;
}

/**
 * The links, with the current section marked. Without a pathname none is: a page
 * with a dynamic segment, like /admin/tags/[id], learns its pathname only in the browser.
 */
export function SidebarLinks({ pathname }: { pathname?: string }) {
  return (
    <ul className="flex gap-1 md:flex-col">
      {sections.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={pathname && isCurrent(href, pathname) ? "page" : undefined}
            className="flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-foreground/7 aria-[current=page]:text-foreground"
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
