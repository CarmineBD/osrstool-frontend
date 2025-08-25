import { useMemo } from "react";
import type { Item } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

interface MarkdownProps {
  content?: string;
  items: Record<number, Item>;
}

export function Markdown({ content = "", items }: MarkdownProps) {
  const html = useMemo(() => {
    const withItems = content.replace(/\{\{item_(\d+)\}\}/g, (_, id) => {
      const item = items[Number(id)];
      const price = item?.lowPrice ?? item?.highPrice;
      return price !== undefined ? formatNumber(price) : "null";
    });
    return parseMarkdown(withItems);
  }, [content, items]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function parseMarkdown(text: string): string {
  const lines = text.split(/\n/);
  let html = "";
  let inList = false;
  for (const line of lines) {
    if (/^\s*-\s+/.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${formatInline(line.replace(/^\s*-\s+/, ""))}</li>`;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (/^\s*>\s?/.test(line)) {
        html += `<blockquote>${formatInline(line.replace(/^\s*>\s?/, ""))}</blockquote>`;
      } else if (line.trim() === "") {
        html += "<br/>";
      } else {
        html += `<p>${formatInline(line)}</p>`;
      }
    }
  }
  if (inList) html += "</ul>";
  return html;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export default Markdown;
