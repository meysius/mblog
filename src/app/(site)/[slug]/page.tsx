import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticle } from "@/components/post-article";
import { excerpt } from "@/lib/markdown";
import { getPublishedPage, getPublishedPages } from "@/lib/pages";
import { alternates, getSiteSettings, openGraphDefaults, shareImages } from "@/lib/site";

// A page such as /about. Rendered like post pages (see posts/[slug]/page.tsx): in
// full before anything is sent, so any other single-segment URL gets a real 404.
// Routes like /rss and /tags/… take precedence; RESERVED_PAGE_SLUGS in
// src/lib/post-kind.ts keeps pages off their URLs.
export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  const pages = await getPublishedPages();
  // At least one is required. With nothing published, "-" stands in: no page can have it.
  return pages.length > 0 ? pages.map(({ slug }) => ({ slug })) : [{ slug: "-" }];
}

type Page = NonNullable<Awaited<ReturnType<typeof getPublishedPage>>>;

function description(page: Page) {
  return page.excerpt || excerpt(page.body, 160);
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const [page, site] = await Promise.all([
    getPublishedPage((await params).slug),
    getSiteSettings(),
  ]);
  if (!page) return { title: "Page not found" };

  const path = `/${page.slug}`;
  const images = shareImages(page.featureImage, page.featureImageAlt);
  return {
    title: page.title,
    description: description(page),
    alternates: alternates(site, path),
    openGraph: {
      ...openGraphDefaults(site),
      type: "website",
      url: path,
      title: page.title,
      description: description(page),
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: page.title,
      description: description(page),
      images,
    },
  };
}

export default async function PagePage({ params }: PageProps<"/[slug]">) {
  const page = await getPublishedPage((await params).slug);
  if (!page) notFound();

  return <PostArticle kind="page" post={page} />;
}
