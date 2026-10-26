import type { MetadataRoute } from "next";
import { mediaSrc } from "@/lib/media";
import { getPublishedPosts } from "@/lib/posts";
import { absoluteUrl } from "@/lib/site";
import { getPublishedTags } from "@/lib/tags";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, tags] = await Promise.all([getPublishedPosts(), getPublishedTags()]);
  const lastChange = Math.max(...posts.map((post) => post.updatedAt.getTime()));

  return [
    // The home page lists every post, so it changes whenever one does.
    { url: absoluteUrl("/"), lastModified: posts.length > 0 ? new Date(lastChange) : undefined },
    ...posts.map((post) => ({
      url: absoluteUrl(`/posts/${post.slug}`),
      lastModified: post.updatedAt,
      images: post.featureImage ? [absoluteUrl(mediaSrc(post.featureImage.url))] : undefined,
    })),
    // A tag's page lists its posts, so it changes whenever one of them does.
    ...tags.map((tag) => ({
      url: absoluteUrl(`/tags/${tag.slug}`),
      lastModified: tag.updatedAt,
    })),
  ];
}
