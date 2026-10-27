import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { laterPages, pageCount, parsePageParam } from "@/lib/pagination";
import { getPublishedTags } from "@/lib/tags";
import { getTag, tagMetadata, TagPosts } from "../../tag-posts";

// A tag's later pages: /tags/<slug>/page/2… Rendered like post pages (see
// posts/[slug]/page.tsx): in full before anything is sent, so a page past the
// last gets a real 404.
export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  const tags = await getPublishedTags();
  const params = tags.flatMap(({ slug, postCount }) =>
    laterPages(pageCount(postCount)).map((page) => ({ slug, page })),
  );
  // At least one is required. With no tag past one page, "-" stands in: no tag or page can have it.
  return params.length > 0 ? params : [{ slug: "-", page: "-" }];
}

async function getTagPage({ slug, page }: { slug: string; page: string }) {
  const n = parsePageParam(page);
  return n ? getTag(slug, n) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/tags/[slug]/page/[page]">): Promise<Metadata> {
  return tagMetadata(await getTagPage(await params));
}

export default async function TagLaterPage({ params }: PageProps<"/tags/[slug]/page/[page]">) {
  const tag = await getTagPage(await params);
  if (!tag) notFound();

  return <TagPosts tag={tag} />;
}
