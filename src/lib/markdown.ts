import type { Nodes } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const parser = unified().use(remarkParse).use(remarkGfm);

/**
 * The post's opening paragraphs as plain text. Headings, code, tables and
 * footnotes are left out, so the excerpt reads like the start of the post.
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
  return paragraphs.join(" ").slice(0, maxLength);
}
