import { cn } from "cn";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const remarkPlugins = [remarkGfm];

// Raw HTML in the source is escaped, not rendered. Styles live in globals.css under .prose.
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose", className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins}>{children}</ReactMarkdown>
    </div>
  );
}
