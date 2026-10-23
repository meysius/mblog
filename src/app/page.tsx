import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";

export default async function Home() {
  const posts = await getPublishedPosts();

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-6 text-3xl font-bold">mblog</h1>
      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.slug} className="flex items-baseline justify-between gap-4">
              <Link href={`/posts/${post.slug}`} className="underline">
                {post.title}
              </Link>
              <time dateTime={post.publishedAt?.toISOString()} className="text-sm opacity-60">
                {post.publishedAt?.toLocaleDateString("en-US")}
              </time>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
