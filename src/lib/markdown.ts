import type { Nodes as HastNodes, Root as HastRoot } from "hast";
import type { Nodes } from "mdast";
import { toString } from "mdast-util-to-string";
import { defaultUrlTransform } from "react-markdown";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { mediaSrc } from "@/lib/media";

const parser = unified().use(remarkParse).use(remarkGfm);

/**
 * The post's opening paragraphs as plain text. Headings, code, tables and
 * footnotes are left out, so the excerpt reads like the start of the post.
 * Text past maxLength is cut at a word boundary and ends with "…".
 */
export function excerpt(markdown: string, maxLength: number) {
  const paragraphs: string[] = [];
  let length = 0;

  const visit = (node: Nodes) => {
    if (length >= maxLength) return;
    if (node.type === "paragraph") {
      const text = toString(node, { includeImageAlt: false }).replace(/\s+/g, " ").trim();
      if (text) {
        paragraphs.push(text);
        length += text.length + 1;
      }
    } else if ("children" in node && node.type !== "footnoteDefinition") {
      node.children.forEach(visit);
    }
  };

  visit(parser.parse(markdown));
  const text = paragraphs.join(" ");
  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–—-]+$/, "")}…`;
}

// Renders like the site does with react-markdown (components/markdown.tsx): raw HTML
// shows as text, and links with unsafe protocols such as javascript: are dropped.
// Feed readers show posts away from the site, so links and images get full URLs.
function rehypeForFeed({ pageUrl }: { pageUrl: string }) {
  const absolute = (url: string) => {
    const safe = defaultUrlTransform(url);
    return safe && URL.canParse(safe, pageUrl) ? new URL(safe, pageUrl).href : "";
  };

  const visit = (node: HastNodes) => {
    if (node.type === "element") {
      const { href, src } = node.properties;
      if (node.tagName === "a" && typeof href === "string") node.properties.href = absolute(href);
      if (node.tagName === "img" && typeof src === "string") {
        node.properties.src = absolute(mediaSrc(src));
      }
    }
    if (!("children" in node)) return;
    for (const [i, child] of node.children.entries()) {
      if (child.type === "raw") node.children[i] = { type: "text", value: child.value };
      else visit(child);
    }
  };

  return (tree: HastRoot) => visit(tree);
}

/** A post's body as HTML, for the RSS feed. pageUrl is the post's full URL. */
export function markdownToHtml(markdown: string, pageUrl: string) {
  const file = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeForFeed, { pageUrl })
    .use(rehypeStringify)
    .processSync(markdown);
  return String(file);
}
