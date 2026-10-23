import Link from "next/link";
import { PostForm } from "./post-form";

export default function NewPostPage() {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Link href="/admin" className="text-sm underline">
        ← Posts
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">New post</h1>
      <PostForm />
    </main>
  );
}
