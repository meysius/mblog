import { Skeleton } from "@/components/ui/skeleton";

export function FormSkeleton({ fields }: { fields: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-5">
      {Array.from({ length: fields }, (_, field) => (
        <div key={field} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
