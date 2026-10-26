import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticle } from "@/components/post-article";
import { excerpt } from "@/lib/markdown";
import { mediaSrc } from "@/lib/media";
import { getPublishedPost, getPublishedPosts } from "@/lib/posts";
import { absoluteUrl, alternates, openGraphDefaults } from "@/lib/site";

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
  const post = await getPublishedPost((await params).slug);
  if (!post) return { title: "Page not found" };

  const path = `/posts/${post.slug}`;
  const images = post.featureImage && [
    {
      url: mediaSrc(post.featureImage.url),
      width: post.featureImage.width,
      height: post.featureImage.height,
      alt: post.featureImageAlt || undefined,
    },
  ];
  return {
    title: post.title,
    description: description(post),
    alternates: alternates(path),
    openGraph: {
      ...openGraphDefaults,
      type: "article",
      url: path,
      title: post.title,
      description: description(post),
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      images: images ?? undefined,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: post.title,
      description: description(post),
      images: images ?? undefined,
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
    image: post.featureImage ? [absoluteUrl(mediaSrc(post.featureImage.url))] : undefined,
  };
  // Escaping "<" keeps text from the post from closing the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
