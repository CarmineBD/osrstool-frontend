import { useEffect } from "react";

type SeoConfig = {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  robots?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

export function getEnvironmentRobotsDirective(): string | undefined {
  const configuredDirective = (
    import.meta.env.VITE_ROBOTS as string | undefined
  )?.trim();
  return configuredDirective || undefined;
}

function resolveSeoBaseUrl(): string {
  const configuredSiteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/$/, "");
  }

  return window.location.origin;
}

function toSeoUrl(path: string): string {
  return new URL(path, `${resolveSeoBaseUrl()}/`).toString();
}

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
  const url = toSeoUrl(path);
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }

  tag.setAttribute("href", url);
}

function upsertRobots(content: string, source?: "explicit" | "environment"): void {
  const selector = 'meta[name="robots"]';
  let tag = document.head.querySelector<HTMLMetaElement>(selector);

  if (!tag) {
    tag = document.createElement("meta");
    tag.name = "robots";
    document.head.appendChild(tag);
  }

  tag.content = content;
  if (source) {
    tag.dataset.rsmethodsSeoRobots = source;
  }
}

function upsertStructuredData(
  structuredData: Record<string, unknown> | Record<string, unknown>[]
): void {
  let tag = document.head.querySelector<HTMLScriptElement>(
    'script[data-rsmethods-seo="structured-data"]'
  );

  if (!tag) {
    tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.dataset.rsmethodsSeo = "structured-data";
    document.head.appendChild(tag);
  }

  tag.textContent = JSON.stringify(structuredData).replace(/</g, "\\u003c");
}

export function useSeo({
  title,
  description,
  path,
  keywords,
  robots,
  structuredData,
}: SeoConfig): void {
  const environmentRobots = getEnvironmentRobotsDirective();
  const effectiveRobots = environmentRobots ?? robots;

  useEffect(() => {
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", toSeoUrl(path));
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);

    if (keywords) {
      upsertMeta("name", "keywords", keywords);
    }

    if (effectiveRobots) {
      upsertRobots(
        effectiveRobots,
        environmentRobots ? "environment" : "explicit",
      );
    }

    if (structuredData) {
      upsertStructuredData(structuredData);
    }

    upsertCanonical(path);
    return () => {
      if (!environmentRobots && robots) {
        document.head
          .querySelector<HTMLMetaElement>(
            'meta[data-rsmethods-seo-robots="explicit"]',
          )
          ?.remove();
      }
    };
  }, [
    description,
    effectiveRobots,
    environmentRobots,
    keywords,
    path,
    robots,
    structuredData,
    title,
  ]);
}
