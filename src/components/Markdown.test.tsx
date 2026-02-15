import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/api";
import { Markdown } from "./Markdown";

function renderMarkdown(content: string, items: Record<number, Item> = {}) {
  return renderToStaticMarkup(<Markdown content={content} items={items} />);
}

describe("Markdown", () => {
  it("escapes script payloads without rendering script tags", () => {
    const html = renderMarkdown('Hola<script>alert("xss")</script>');

    expect(html).not.toContain("<script");
    expect(html).toContain("Hola");
    expect(html).not.toContain("script");
  });

  it("escapes html with event handlers like onerror", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)" />');

    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
  });

  it("blocks javascript links in markdown", () => {
    const html = renderMarkdown("[click me](javascript:alert(1))");

    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("<span>click me</span>");
  });

  it("renders safe links with target and rel attributes", () => {
    const html = renderMarkdown("[safe](https://example.com)");

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("replaces item placeholders before markdown rendering", () => {
    const html = renderMarkdown("Price: {{item_42}}", {
      42: {
        name: "Coins",
        iconUrl: "https://example.com/icon.png",
        lowPrice: 12345,
      },
    });

    expect(html).toContain("12.35k");
  });
});
