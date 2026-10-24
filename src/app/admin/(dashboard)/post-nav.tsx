"use client";

import { FilePen, Files, Globe } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_LABELS, parseStatus, postsHref } from "./post-filters";

const filters = [
  { status: undefined, icon: Files },
  { status: "draft", icon: FilePen },
  { status: "published", icon: Globe },
] as const;

export function PostNav({ counts }: { counts: Record<keyof typeof FILTER_LABELS, number> }) {
  const pathname = usePathname();
  const current = parseStatus(useSearchParams().get("status"));

  return (
    <ul className="flex gap-1 md:flex-col">
      {filters.map(({ status, icon: Icon }) => {
        const key = status ?? "all";
        const active = pathname === "/admin" && current === status;
        return (
          <li key={key}>
            <Link
              href={postsHref(status)}
              aria-current={active ? "page" : undefined}
              className="flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-foreground/7 aria-[current=page]:text-foreground md:px-2"
            >
              <Icon className="size-4 shrink-0" />
              {FILTER_LABELS[key]}
              <span className="ml-auto pl-1 text-xs tabular-nums">{counts[key]}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function PostNavSkeleton() {
  return (
    <div aria-hidden className="flex gap-1 md:flex-col">
      {filters.map(({ status }) => (
        <div key={status ?? "all"} className="flex h-8 items-center px-2.5 md:px-2">
          <Skeleton className="h-3.5 w-20 bg-foreground/7" />
        </div>
      ))}
    </div>
  );
}
