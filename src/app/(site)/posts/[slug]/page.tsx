import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLongDate } from "@/lib/format";
import { getPublishedPost } from "@/lib/posts";

export async function generateMetadata({
  params,
}: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  return post ? { title: post.title } : {};
}

export default function PostPage({ params }: PageProps<"/posts/[slug]">) {
  return (
    <Suspense fallback={<PostSkeleton />}>
      {params.then(({ slug }) => (
        <Post slug={slug} />
      ))}
    </Suspense>
  );
}

async function Post({ slug }: { slug: string }) {
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  return (
    <article>
      <header className="mb-10">
        <time dateTime={post.publishedAt.toISOString()} className="text-sm text-muted-foreground">
          {formatLongDate(post.publishedAt)}
        </time>
        <h1 className="mt-3 font-serif text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          {post.title}
        </h1>
      </header>
      {/* Plain text for now; Markdown rendering comes later. */}
      <div className="max-w-[65ch] font-serif text-[1.1875rem] leading-[1.7] whitespace-pre-wrap">
        {post.body}
      </div>
    </article>
  );
}

function PostSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-4 h-11 w-3/4" />
      <div className="mt-12 flex max-w-[65ch] flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
