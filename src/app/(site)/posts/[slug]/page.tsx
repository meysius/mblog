import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticle } from "@/components/post-article";
import { excerpt } from "@/lib/markdown";
import { mediaSrc } from "@/lib/media";
import { getPublishedPost, getPublishedPosts } from "@/lib/posts";
import {
  absoluteUrl,
  alternates,
  getSiteSettings,
  openGraphDefaults,
  shareImages,
} from "@/lib/site";

// The whole page renders before anything is sent, so a missing post gets a real
// 404 status rather than a 200 with "Page not found" streamed into it. Published
// posts are prerendered at build; any other URL renders on its first visit, and
// either way the result is kept until a save changes the posts, or for an hour.
export const ensureStatic = "navigation";
// Without a loading state, following a link waits for the page instead of
// showing a skeleton first.
export const instant = false;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  // At least one is required. With nothing published, "-" stands in: no post can have it.
  return posts.length > 0 ? posts.map(({ slug }) => ({ slug })) : [{ slug: "-" }];
}

type Post = NonNullable<Awaited<ReturnType<typeof getPublishedPost>>>;

function description(post: Post) {
  return post.excerpt || excerpt(post.body, 160);
}

export async function generateMetadata({
  params,
}: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const [post, site] = await Promise.all([
    getPublishedPost((await params).slug),
    getSiteSettings(),
  ]);
  if (!post) return { title: "Page not found" };

  const path = `/posts/${post.slug}`;
  const images = shareImages(post.featureImage, post.featureImageAlt);
  return {
    title: post.title,
    description: description(post),
    alternates: alternates(site, path),
    openGraph: {
      ...openGraphDefaults(site),
      type: "article",
      url: path,
      title: post.title,
      description: description(post),
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      tags: post.tags.map((tag) => tag.name),
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: post.title,
      description: description(post),
      images,
    },
  };
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(post) }} />
      <PostArticle post={post} />
    </>
  );
}

// Structured data that search engines read to show the post as an article.
function jsonLd(post: Post) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: description(post),
    url: absoluteUrl(`/posts/${post.slug}`),
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    keywords: post.tags.length > 0 ? post.tags.map((tag) => tag.name) : undefined,
    image: post.featureImage ? [absoluteUrl(mediaSrc(post.featureImage.url))] : undefined,
  };
  // Escaping "<" keeps text from the post from closing the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
