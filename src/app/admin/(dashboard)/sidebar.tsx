import { ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getPostCounts } from "@/lib/posts";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import { PostNav, PostNavSkeleton } from "./post-nav";
import { UserMenu } from "./user-menu";

// A column down the left on wider screens; a header above the page on small ones.
export function Sidebar() {
  return (
    <aside className="flex flex-col gap-3 border-b bg-muted/40 px-4 pt-3 pb-2 md:fixed md:inset-y-0 md:left-0 md:w-60 md:gap-5 md:border-r md:border-b-0 md:px-3 md:py-4">
      <div className="flex h-8 items-center justify-between gap-2 md:px-2">
        <Link href="/admin" className="font-serif text-xl font-semibold tracking-tight">
          {SITE_NAME}
        </Link>
        <div className="flex items-center gap-3 md:hidden">
          <Link href="/admin/new" className={buttonVariants({ size: "sm" })}>
            <Plus data-icon="inline-start" />
            New post
          </Link>
          <Suspense fallback={<Skeleton className="size-7 rounded-full" />}>
            <CurrentUserMenu compact />
          </Suspense>
        </div>
      </div>

      <Link href="/admin/new" className={cn(buttonVariants(), "hidden md:flex")}>
        <Plus data-icon="inline-start" />
        New post
      </Link>

      <nav aria-label="Posts" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <Suspense fallback={<PostNavSkeleton />}>
          <PostNavWithCounts />
        </Suspense>
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

async function PostNavWithCounts() {
  // Render at request time so the counts match the database.
  await connection();
  return <PostNav counts={await getPostCounts()} />;
}

async function CurrentUserMenu({ compact }: { compact?: boolean }) {
  const user = await requireUser();
  return <UserMenu user={user} compact={compact} />;
}
