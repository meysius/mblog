import type { Metadata } from "next";
import { PageLinks, PostList } from "@/components/post-list";
import { formatPostCount } from "@/lib/format";
import { pagePath } from "@/lib/pagination";
import { getPublishedPostsTagged } from "@/lib/posts";
import { alternates, getSiteSettings, openGraphDefaults } from "@/lib/site";
import { getPublishedTag } from "@/lib/tags";

// Shared by a tag's first page, /tags/<slug>, and its later ones, /tags/<slug>/page/2…

// A tag's page is on the blog once one of its posts is. Null for a later page
// past the last.
export async function getTag(slug: string, page: number) {
  const tag = await getPublishedTag(slug);
  if (!tag) return null;
  const tagged = await getPublishedPostsTagged(tag.id, page);
  return tagged.posts.length > 0 ? { ...tag, ...tagged, page } : null;
}

type Tag = NonNullable<Awaited<ReturnType<typeof getTag>>>;

function description(tag: Tag) {
  return tag.description || `Posts tagged “${tag.name}”.`;
}

export async function tagMetadata(tag: Tag | null): Promise<Metadata> {
  if (!tag) return { title: "Page not found" };

  const site = await getSiteSettings();
  const path = pagePath(`/tags/${tag.slug}`, tag.page);
  const title = tag.page > 1 ? `${tag.name}, page ${tag.page}` : tag.name;
  return {
    title,
    description: description(tag),
    alternates: alternates(site, path),
    openGraph: {
      ...openGraphDefaults(site),
      type: "website",
      url: path,
      title,
      description: description(tag),
    },
  };
}

export function TagPosts({ tag }: { tag: Tag }) {
  return (
    <>
      <header className="mb-14">
        <p className="text-sm text-muted-foreground">{formatPostCount(tag.total)} tagged</p>
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
      {tag.pageCount > 1 && (
        <PageLinks
          path={`/tags/${tag.slug}`}
          page={tag.page}
          pageCount={tag.pageCount}
          className="mt-16"
        />
      )}
    </>
  );
}
