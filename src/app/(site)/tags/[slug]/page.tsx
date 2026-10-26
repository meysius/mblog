import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostList } from "@/components/post-list";
import { formatPostCount } from "@/lib/format";
import { getPublishedPostsTagged } from "@/lib/posts";
import { alternates, getSiteSettings, openGraphDefaults } from "@/lib/site";
import { getPublishedTag, getPublishedTags } from "@/lib/tags";

// Rendered like post pages (see posts/[slug]/page.tsx): in full before anything is
// sent, so a tag that no published post has gets a real 404.
export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  const tags = await getPublishedTags();
  // At least one is required. With no tags in use, "-" stands in: no tag can have it.
  return tags.length > 0 ? tags.map(({ slug }) => ({ slug })) : [{ slug: "-" }];
}

// A tag's page is on the blog once one of its posts is.
async function getTag(slug: string) {
  const tag = await getPublishedTag(slug);
  if (!tag) return null;
  const posts = await getPublishedPostsTagged(tag.id);
  return posts.length > 0 ? { ...tag, posts } : null;
}

type Tag = NonNullable<Awaited<ReturnType<typeof getTag>>>;

function description(tag: Tag) {
  return tag.description || `Posts tagged “${tag.name}”.`;
}

export async function generateMetadata({ params }: PageProps<"/tags/[slug]">): Promise<Metadata> {
  const [tag, site] = await Promise.all([getTag((await params).slug), getSiteSettings()]);
  if (!tag) return { title: "Page not found" };

  const path = `/tags/${tag.slug}`;
  return {
    title: tag.name,
    description: description(tag),
    alternates: alternates(site, path),
    openGraph: {
      ...openGraphDefaults(site),
      type: "website",
      url: path,
      title: tag.name,
      description: description(tag),
    },
  };
}

export default async function TagPage({ params }: PageProps<"/tags/[slug]">) {
  const tag = await getTag((await params).slug);
  if (!tag) notFound();

  return (
    <>
      <header className="mb-14">
        <p className="text-sm text-muted-foreground">
          {formatPostCount(tag.posts.length)} tagged
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          {tag.name}
        </h1>
        {tag.description && (
          <p className="mt-4 font-serif text-xl leading-snug text-pretty text-muted-foreground sm:text-2xl">
            {tag.description}
          </p>
        )}
      </header>
      <PostList posts={tag.posts} />
    </>
  );
}
