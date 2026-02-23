import { useEffect } from "react";

type SeoConfig = {
  title: string;
  description: string;
  path: string;
  keywords?: string;
};

function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string
): void {
  const selector = `meta[${attr}="${key}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function upsertCanonical(path: string): void {
  const base = window.location.origin;
  const url = new URL(path, base).toString();
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }

  tag.setAttribute("href", url);
}

export function useSeo({ title, description, path, keywords }: SeoConfig): void {
  useEffect(() => {
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", new URL(path, window.location.origin).toString());
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);

    if (keywords) {
      upsertMeta("name", "keywords", keywords);
    }

    upsertCanonical(path);
  }, [description, keywords, path, title]);
}

