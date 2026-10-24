"use client";

import { Files } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [{ href: "/admin", label: "Posts", icon: Files }];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {sections.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={pathname === href ? "page" : undefined}
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
