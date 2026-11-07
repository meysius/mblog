import Link from "next/link";
import type { PostTag } from "@/lib/posts";

/** Tags as pills, each leading to its page. */
export function TagLinks({ tags }: { tags: PostTag[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <li key={tag.name}>
          <Link
            href={`/tags/${tag.slug}`}
            className="flex h-8 items-center rounded-full border px-3.5 text-sm text-muted-foreground transition-colors outline-none hover:border-foreground/25 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {tag.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
