import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostGrid } from "@/components/post-list";
import { laterPages, pagePath, parsePageParam } from "@/lib/pagination";
import { getHomePage } from "@/lib/posts";
import { alternates, getSiteSettings, openGraphDefaults } from "@/lib/site";
import { loadHomePage } from "../../actions";

// The home page's later pages: /page/2, /page/3… Rendered like post pages (see
// posts/[slug]/page.tsx): in full before anything is sent, so a page past the
// last gets a real 404.
export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  const { pageCount } = await getHomePage(1);
  const pages = laterPages(pageCount);
  // At least one is required. With a single page, "-" stands in: no page can have it.
  return pages.length > 0 ? pages.map((page) => ({ page })) : [{ page: "-" }];
}

async function getPage(param: string) {
  const page = parsePageParam(param);
  if (!page) return null;
  const home = await getHomePage(page);
  return home.posts.length > 0 ? { ...home, page } : null;
}

export async function generateMetadata({ params }: PageProps<"/page/[page]">): Promise<Metadata> {
  const [home, site] = await Promise.all([getPage((await params).page), getSiteSettings()]);
  if (!home) return { title: "Page not found" };

  const path = pagePath("/", home.page);
  const title = `Page ${home.page}`;
  return {
    title,
    alternates: alternates(site, path),
    openGraph: {
      ...openGraphDefaults(site),
      type: "website",
      url: path,
      title,
      description: site.description,
    },
  };
}

export default async function HomeLaterPage({ params }: PageProps<"/page/[page]">) {
  const [home, site] = await Promise.all([getPage((await params).page), getSiteSettings()]);
  if (!home) notFound();

  return (
    <div data-home className="min-w-0">
      <h1 className="sr-only">
        {site.title}, page {home.page}
      </h1>
      <PostGrid
        label="The journal"
        note={`Page ${home.page} of ${home.pageCount}`}
        posts={home.posts}
        path="/"
        page={home.page}
        pageCount={home.pageCount}
        loadPageAction={loadHomePage}
      />
    </div>
  );
}
