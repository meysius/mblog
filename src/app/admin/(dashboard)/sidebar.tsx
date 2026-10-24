import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

// A column down the left on wider screens; a header above the page on small ones.
export function Sidebar() {
  return (
    <aside className="flex flex-col gap-5 border-b bg-muted/40 px-4 py-3 md:fixed md:inset-y-0 md:left-0 md:w-60 md:border-r md:border-b-0 md:px-3 md:py-4">
      <div className="flex h-8 items-center justify-between gap-2 md:px-2">
        <Link href="/admin" className="font-serif text-xl font-semibold tracking-tight">
          {SITE_NAME}
        </Link>
        <div className="md:hidden">
          <Suspense fallback={<Skeleton className="size-7 rounded-full" />}>
            <CurrentUserMenu compact />
          </Suspense>
        </div>
      </div>

      {/* Posts is the only section so far, so small screens go without. */}
      <nav aria-label="Admin" className="max-md:hidden">
        <SidebarNav />
      </nav>

      <div className="mt-auto hidden flex-col gap-1 md:flex">
        <Link
          href="/"
          className="flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <ArrowUpRight className="size-4" />
          View site
        </Link>
        <Suspense fallback={<Skeleton className="h-10 w-full bg-foreground/7" />}>
          <CurrentUserMenu />
        </Suspense>
      </div>
    </aside>
  );
}

async function CurrentUserMenu({ compact }: { compact?: boolean }) {
  const user = await requireUser();
  return <UserMenu user={user} compact={compact} />;
}
