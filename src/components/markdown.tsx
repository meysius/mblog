import { cn } from "cn";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { mediaSrc } from "@/lib/media";

const remarkPlugins = [remarkGfm];

const components: Components = {
  img: ({ src, alt, title }) =>
    // Images without a source (like an upload still in progress) render nothing.
    typeof src === "string" && src ? (
      // Markdown carries no dimensions, so this stays a plain lazy-loaded <img>.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={mediaSrc(src)} alt={alt ?? ""} title={title} loading="lazy" decoding="async" />
    ) : null,
};

// Raw HTML in the source is escaped, not rendered. Styles live in globals.css under .prose.
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose", className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
