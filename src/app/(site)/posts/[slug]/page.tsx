import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostArticle, PostArticleSkeleton } from "@/components/post-article";
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
    <Suspense fallback={<PostArticleSkeleton />}>
      {params.then(({ slug }) => (
        <Post slug={slug} />
      ))}
    </Suspense>
  );
}

async function Post({ slug }: { slug: string }) {
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  return <PostArticle post={post} />;
}
