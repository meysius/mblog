import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPublishedPost } from "@/lib/posts";

export default function PostPage({ params }: PageProps<"/posts/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Link href="/" className="text-sm underline">
        ← All posts
      </Link>
      <Suspense fallback={<p className="mt-4">Loading…</p>}>
        {params.then(({ slug }) => (
          <Post slug={slug} />
        ))}
      </Suspense>
    </main>
  );
}

async function Post({ slug }: { slug: string }) {
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  return (
    <article className="mt-4">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <time dateTime={post.publishedAt?.toISOString()} className="text-sm opacity-60">
        {post.publishedAt?.toLocaleDateString("en-US")}
      </time>
      {/* Plain text for now; Markdown rendering comes later. */}
      <div className="mt-6 whitespace-pre-wrap">{post.body}</div>
    </article>
  );
}
