import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PostArticle, PostArticleSkeleton } from "@/components/post-article";
import { SiteShell } from "@/components/site-shell";
import { editorPath, type PostKind } from "@/lib/post-kind";
import { getPostForEditing } from "@/lib/posts";

// A post or page as readers see it, including drafts. Outside the dashboard
// group, so it gets the site's layout instead of the admin's.

async function getPost(kind: PostKind, idParam: string) {
  const id = Number(idParam);
  const post = Number.isSafeInteger(id) ? await getPostForEditing(id) : null;
  return post?.kind === kind ? post : null;
}

export async function previewMetadata(
  kind: PostKind,
  params: Promise<{ id: string }>,
): Promise<Metadata> {
  const post = await getPost(kind, (await params).id);
  return {
    title: post ? `Preview: ${post.title}` : "Preview",
    robots: { index: false, follow: false },
  };
}

type PreviewPageProps = { kind: PostKind; params: Promise<{ id: string }> };

export function PreviewPage({ kind, params }: PreviewPageProps) {
  return (
    <Suspense
      fallback={
        <SiteShell>
          <PostArticleSkeleton />
        </SiteShell>
      }
    >
      {params.then(({ id }) => (
        <Preview kind={kind} id={id} />
      ))}
    </Suspense>
  );
}

async function Preview({ kind, id }: { kind: PostKind; id: string }) {
  // Render at request time so the preview always shows the saved version.
  await connection();
  const post = await getPost(kind, id);
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
            href={editorPath(kind, post.id)}
            className="shrink-0 font-medium underline-offset-4 hover:underline"
          >
            Edit {kind}
          </Link>
        </div>
      </div>
      <SiteShell>
        <PostArticle kind={kind} post={post} />
      </SiteShell>
    </>
  );
}
