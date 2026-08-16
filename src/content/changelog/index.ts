export type ChangelogEntry = {
  slug: string;
  date: string;
  version: string;
  title: string;
  summary: string;
  fileName: string;
};

const changelogLoaders = import.meta.glob("./*.md", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>;

const entries: ChangelogEntry[] = [
  {
    slug: "2026-08-05-v2026-08-05-pr118",
    date: "2026-08-05",
    version: "v2026.08.05-pr118",
    title: "Enhance user experience with new features and translations",
    summary:
      "Latest user-facing updates, improvements, and fixes in RSMethods.",
    fileName: "2026-08-05-v2026-08-05-pr118.md",
  },
  {
    slug: "2026-07-24-v2026-07-24-pr107",
    date: "2026-07-24",
    version: "v2026.07.24-pr107",
    title: "English translate and variants component fixes",
    summary:
      "Latest user-facing updates, improvements, and fixes in RSMethods.",
    fileName: "2026-07-24-v2026-07-24-pr107.md",
  },
  {
    slug: "2026-02-22-v0.3.0",
    date: "2026-02-22",
    version: "v0.3.0",
    title: "Landing SEO + Changelog",
    summary:
      "New SEO-focused landing page, the methods list moved to /allMethods, and a browsable changelog.",
    fileName: "2026-02-22-v0.3.0.md",
  },
  {
    slug: "2026-02-20-v0.2.2",
    date: "2026-02-20",
    version: "v0.2.2",
    title: "Navigation improvements",
    summary:
      "Menu and readability refinements to reduce friction between discovery and use.",
    fileName: "2026-02-20-v0.2.2.md",
  },
  {
    slug: "2026-02-18-v0.2.1",
    date: "2026-02-18",
    version: "v0.2.1",
    title: "Performance improvements",
    summary:
      "Fewer redundant renders and better initial responsiveness in high-traffic views.",
    fileName: "2026-02-18-v0.2.1.md",
  },
  {
    slug: "2026-02-14-v0.2.0",
    date: "2026-02-14",
    version: "v0.2.0",
    title: "Advanced filters and search",
    summary:
      "New category, skill, and risk filters to speed up discovery of useful methods.",
    fileName: "2026-02-14-v0.2.0.md",
  },
  {
    slug: "2026-02-10-v0.1.1",
    date: "2026-02-10",
    version: "v0.1.1",
    title: "Overall stability",
    summary:
      "Protected-route fixes and better resilience when data loading fails.",
    fileName: "2026-02-10-v0.1.1.md",
  },
  {
    slug: "2026-02-05-v0.1.0",
    date: "2026-02-05",
    version: "v0.1.0",
    title: "Product foundation",
    summary:
      "Initial release with the methods list, detail view, and authentication groundwork.",
    fileName: "2026-02-05-v0.1.0.md",
  },
];

export const changelogEntries = [...entries].sort((a, b) =>
  b.date.localeCompare(a.date)
);

export const latestChangelogEntries = changelogEntries.slice(0, 3);

export function getChangelogEntryBySlug(slug: string): ChangelogEntry | null {
  return changelogEntries.find((entry) => entry.slug === slug) ?? null;
}

export async function getChangelogContentBySlug(
  slug: string
): Promise<string | null> {
  const entry = getChangelogEntryBySlug(slug);
  if (!entry) {
    return null;
  }

  const loader = changelogLoaders[`./${entry.fileName}`];
  if (!loader) {
    return null;
  }

  return loader();
}

export function formatChangelogDate(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
