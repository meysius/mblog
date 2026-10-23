import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getAllPosts } from "@/lib/posts";

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link href="/admin/new" className="rounded bg-foreground px-4 py-2 text-background">
          New post
        </Link>
      </div>
      <Suspense fallback={<p>Loading…</p>}>
        <PostList />
      </Suspense>
    </main>
  );
}

async function PostList() {
  // Render at request time so the admin always sees the current database state.
  await connection();
  const posts = await getAllPosts();

  if (posts.length === 0) return <p>No posts yet.</p>;

  return (
    <ul className="divide-y">
      {posts.map((post) => (
        <li key={post.id} className="flex justify-between py-2">
          <span>
            {post.title} <span className="font-mono text-sm opacity-60">/{post.slug}</span>
          </span>
          <span className="text-sm opacity-60">
            {post.publishedAt ? `Published ${post.publishedAt.toLocaleDateString("en-US")}` : "Draft"}
          </span>
        </li>
      ))}
    </ul>
  );
}
