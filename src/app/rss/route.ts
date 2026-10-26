import { excerpt, markdownToHtml } from "@/lib/markdown";
import { mediaSrc } from "@/lib/media";
import { getFeedPosts } from "@/lib/posts";
import { absoluteUrl, getSiteSettings, RSS_PATH } from "@/lib/site";

// The newest posts the feed carries. Feed readers keep the ones they've already fetched.
const FEED_SIZE = 20;

// Characters XML doesn't allow anywhere, such as control characters pasted into a post.
const INVALID_XML = /[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu;

function escapeXml(value: string) {
  return value
    .replace(INVALID_XML, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// HTML goes in CDATA, which can't contain "]]>", so that's split across two sections.
function cdata(html: string) {
  return `<![CDATA[${html.replace(INVALID_XML, "").replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

export async function GET() {
  const [posts, site] = await Promise.all([getFeedPosts(FEED_SIZE), getSiteSettings()]);
  const lastChange = Math.max(...posts.map((post) => post.updatedAt.getTime()));

  const items = posts.map((post) => {
    const url = absoluteUrl(`/posts/${post.slug}`);
    // Readers show the post on its own, so the feature image leads the content.
    const image = post.featureImage
      ? `<p><img src="${escapeXml(absoluteUrl(mediaSrc(post.featureImage.url)))}" alt="${escapeXml(post.featureImageAlt)}" width="${post.featureImage.width}" height="${post.featureImage.height}"></p>`
      : "";
    const categories = post.tags
      .map((tag) => `\n      <category>${escapeXml(tag.name)}</category>`)
      .join("");
    return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="false">${post.id}</guid>
      <pubDate>${post.publishedAt.toUTCString()}</pubDate>${categories}
      <description>${escapeXml(post.excerpt || excerpt(post.body, 300))}</description>
      <content:encoded>${cdata(image + markdownToHtml(post.body, url))}</content:encoded>
    </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${escapeXml(absoluteUrl("/"))}</link>
    <description>${escapeXml(site.description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(absoluteUrl(RSS_PATH))}" rel="self" type="application/rss+xml"/>${
      posts.length > 0
        ? `
    <lastBuildDate>${new Date(lastChange).toUTCString()}</lastBuildDate>`
        : ""
    }${items.join("")}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
