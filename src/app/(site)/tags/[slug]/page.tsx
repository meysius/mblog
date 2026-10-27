import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedTags } from "@/lib/tags";
import { getTag, tagMetadata, TagPosts } from "./tag-posts";

// Rendered like post pages (see posts/[slug]/page.tsx): in full before anything is
// sent, so a tag that no published post has gets a real 404.
export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  const tags = await getPublishedTags();
  // At least one is required. With no tags in use, "-" stands in: no tag can have it.
  return tags.length > 0 ? tags.map(({ slug }) => ({ slug })) : [{ slug: "-" }];
}

export async function generateMetadata({ params }: PageProps<"/tags/[slug]">): Promise<Metadata> {
  return tagMetadata(await getTag((await params).slug, 1));
}

export default async function TagPage({ params }: PageProps<"/tags/[slug]">) {
  const tag = await getTag((await params).slug, 1);
  if (!tag) notFound();

  return <TagPosts tag={tag} />;
}
