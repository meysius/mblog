import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackToTags() {
  return (
    <Link
      href="/admin/tags"
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2.5 text-muted-foreground")}
    >
      <ArrowLeft data-icon="inline-start" />
      Tags
    </Link>
  );
}
