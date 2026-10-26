import { Skeleton } from "@/components/ui/skeleton";

/** The editor's layout while the post and tags load. */
export function EditorSkeleton() {
  return (
    <div aria-hidden className="flex flex-1 flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-3 sm:px-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-9 sm:w-20" />
          <Skeleton className="h-5 w-16 rounded-4xl max-sm:hidden" />
        </div>
        <Skeleton className="h-8 w-24 sm:w-52" />
        <div className="ml-auto flex items-center gap-1.5">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="size-8" />
        </div>
      </div>
      <div className="flex flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pt-12 sm:pt-16">
          <Skeleton className="h-12 w-2/3" />
          <div className="flex max-w-[65ch] flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <div className="hidden w-80 shrink-0 flex-col gap-7 border-l p-5 lg:flex">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="aspect-video w-full" />
        </div>
      </div>
    </div>
  );
}
