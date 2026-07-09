import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import type { Item } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";

interface MarkdownProps {
  content?: string;
  items: Record<number, Item>;
}

export function Markdown({ content = "", items }: MarkdownProps) {
  const withItems = useMemo(() => {
    return content.replace(/\{\{item_(\d+)\}\}/g, (_, id) => {
      const item = items[Number(id)];
      const price = item?.lowPrice ?? item?.highPrice;
      return price !== undefined ? formatNumber(price) : "...";
    });
  }, [content, items]);

  return (
    <ReactMarkdown
      rehypePlugins={[rehypeSanitize]}
      components={{
        p: ({ className, node, ...props }) => {
          void node;
          return (
            <p
              {...props}
              className={cn(className, "mb-4 whitespace-pre-wrap last:mb-0")}
            />
          );
        },
        li: ({ className, node, ...props }) => {
          void node;
          return <li {...props} className={cn(className, "whitespace-pre-wrap")} />;
        },
        a: ({ href, node, ...props }) => {
          void node;
          if (!href) {
            return <span>{props.children}</span>;
          }
          return (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            />
          );
        },
      }}
    >
      {withItems}
    </ReactMarkdown>
  );
}

export default Markdown;
