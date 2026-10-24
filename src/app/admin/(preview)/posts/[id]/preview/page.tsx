import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PostArticle, PostArticleSkeleton } from "@/components/post-article";
import { SiteShell } from "@/components/site-shell";
import { getPostForEditing } from "@/lib/posts";

// A post as readers see it, including drafts. Outside the dashboard group,
// so it gets the site's layout instead of the admin's.

async function getPost(idParam: string) {
  const id = Number(idParam);
  return Number.isSafeInteger(id) ? getPostForEditing(id) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/admin/posts/[id]/preview">): Promise<Metadata> {
  const post = await getPost((await params).id);
  return {
    title: post ? `Preview: ${post.title}` : "Preview",
    robots: { index: false, follow: false },
  };
}

export default function PreviewPage({ params }: PageProps<"/admin/posts/[id]/preview">) {
  return (
    <Suspense
      fallback={
        <SiteShell>
          <PostArticleSkeleton />
        </SiteShell>
      }
    >
      {params.then(({ id }) => (
        <Preview id={id} />
      ))}
    </Suspense>
  );
}

async function Preview({ id }: { id: string }) {
  // Render at request time so the preview always shows the saved version.
  await connection();
  const post = await getPost(id);
  if (!post) notFound();

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-11 w-full max-w-3xl items-center justify-between gap-4 px-6 text-sm">
          <p className="truncate text-muted-foreground">
            {post.publishedAt ? (
              <>
                <span className="font-medium text-foreground">Preview</span> · The saved
                version, as readers see it.
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">Draft preview</span> · Only you can
                see this page.
              </>
            )}
          </p>
          <Link
            href={`/admin/posts/${post.id}`}
            className="shrink-0 font-medium underline-offset-4 hover:underline"
          >
            Edit post
          </Link>
        </div>
      </div>
      <SiteShell>
        <PostArticle post={post} />
      </SiteShell>
    </>
  );
}
