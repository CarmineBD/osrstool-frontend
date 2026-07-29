#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CHANGELOG_DIR = join("src", "content", "changelog");
const CHANGELOG_INDEX = join(CHANGELOG_DIR, "index.ts");

const CATEGORIES = {
  New: ["feat"],
  Improved: ["perf", "refactor"],
  Fixed: ["fix"],
};

const EXCLUDED_TYPES = new Set(["build", "chore", "ci", "docs", "test"]);
const EXCLUDED_LABELS = new Set([
  "release:exclude",
  "build",
  "chore",
  "ci",
  "docs",
  "test",
]);

function parseArgs() {
  const args = new Map();

  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index];
    const value = process.argv[index + 1];

    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? "<empty>"}`);
    }

    args.set(key.slice(2), value.trim());
  }

  return args;
}

function required(args, key) {
  const value = args.get(key);
  if (!value) {
    throw new Error(`Missing required --${key}`);
  }
  return value;
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  }).trim();
}

function isAncestor(commit, ref) {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", commit, ref], {
    stdio: "ignore",
  });
  return result.status === 0;
}

function sanitizeSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseConventionalTitle(title) {
  const match = title.match(/^([a-z]+)(?:\([^)]+\))?!?:\s*(.+)$/i);
  if (!match) {
    return { type: null, subject: title.trim() };
  }

  return {
    type: match[1].toLowerCase(),
    subject: match[2].trim(),
  };
}

function extractVersion({ releaseTitle, releasePrNumber, date }) {
  const explicitVersion = releaseTitle.match(
    /\bv(?:\d+\.){1,3}\d+(?:[-.][a-z0-9]+)?\b/i
  );

  if (explicitVersion) {
    return explicitVersion[0];
  }

  return `v${date.replaceAll("-", ".")}-pr${releasePrNumber}`;
}

function extractTitle(releaseTitle, version) {
  const withoutPrefix = releaseTitle.replace(/^[a-z]+(?:\([^)]+\))?!?:\s*/i, "");
  const withoutVersion = withoutPrefix.replace(version, "").replace(/[()]/g, "");
  const normalized = withoutVersion.trim();

  return normalized || "Product update";
}

function extractUserFacingItems(body) {
  const lines = (body ?? "").split(/\r?\n/);
  const startIndex = lines.findIndex((line) =>
    /^##\s+user-facing changelog\s*$/i.test(line.trim())
  );

  if (startIndex === -1) {
    return [];
  }

  const sectionLines = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (/^##\s+/.test(line.trim())) {
      break;
    }
    sectionLines.push(line.trim());
  }

  return sectionLines
    .filter(Boolean)
    .filter((line) => !/^no user-facing changes\.?$/i.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

function categoryForPr(pr, hasUserFacingItems) {
  const labels = pr.labels.map((label) => label.name);

  if (labels.includes("release:feature")) {
    return "New";
  }

  if (labels.includes("release:improvement")) {
    return "Improved";
  }

  if (labels.includes("release:fix")) {
    return "Fixed";
  }

  const { type } = parseConventionalTitle(pr.title);
  if (!type && hasUserFacingItems) {
    return "Improved";
  }

  if (!type || EXCLUDED_TYPES.has(type)) {
    return null;
  }

  return Object.entries(CATEGORIES).find(([, types]) => types.includes(type))?.[0] ?? null;
}

function shouldExcludePr(pr) {
  const labels = pr.labels.map((label) => label.name);
  return labels.some((label) => EXCLUDED_LABELS.has(label));
}

function fallbackItemFromTitle(title) {
  const { subject } = parseConventionalTitle(title);
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}

function toTsString(value) {
  return JSON.stringify(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function markdownForEntry({ version, title, summary, groupedItems }) {
  const sections = Object.entries(groupedItems)
    .filter(([, items]) => items.length > 0)
    .map(([sectionTitle, items]) => {
      const bullets = items.map((item) => `- ${item}`).join("\n");
      return `## ${sectionTitle}\n${bullets}`;
    })
    .join("\n\n");

  return `# ${version} - ${title}

## Summary
${summary}

${sections}
`;
}

function buildIndexEntry({ slug, date, version, title, summary, fileName }) {
  return `  {
    slug: ${toTsString(slug)},
    date: ${toTsString(date)},
    version: ${toTsString(version)},
    title: ${toTsString(title)},
    summary:
      ${toTsString(summary)},
    fileName: ${toTsString(fileName)},
  },
`;
}

function upsertIndexEntry(entry) {
  const current = readFileSync(CHANGELOG_INDEX, "utf8");
  const nextEntry = buildIndexEntry(entry);
  const escapedSlugLiteral = escapeRegExp(toTsString(entry.slug));
  const existingEntry = new RegExp(
    `  \\{\\n    slug: ${escapedSlugLiteral},[\\s\\S]*?\\n  \\},\\n`,
    "m"
  );

  if (existingEntry.test(current)) {
    writeFileSync(CHANGELOG_INDEX, current.replace(existingEntry, nextEntry));
    return;
  }

  const marker = "const entries: ChangelogEntry[] = [\n";
  if (!current.includes(marker)) {
    throw new Error(`Could not find changelog entries marker in ${CHANGELOG_INDEX}`);
  }

  writeFileSync(CHANGELOG_INDEX, current.replace(marker, `${marker}${nextEntry}`));
}

function main() {
  const args = parseArgs();
  const baseRef = required(args, "base");
  const headRef = required(args, "head");
  const releasePrNumber = required(args, "release-pr");
  const releaseTitle = required(args, "release-title");
  const date = args.get("date") || new Date().toISOString().slice(0, 10);
  const version = args.get("version") || extractVersion({ releaseTitle, releasePrNumber, date });
  const title = args.get("title") || extractTitle(releaseTitle, version);
  const summary =
    args.get("summary") ||
    "Latest user-facing updates, improvements, and fixes in OSRSTool.";
  const repo = process.env.GITHUB_REPOSITORY;

  if (!repo) {
    throw new Error("GITHUB_REPOSITORY is required");
  }

  git(["rev-parse", "--verify", baseRef]);
  git(["rev-parse", "--verify", headRef]);

  const pullRequests = JSON.parse(
    gh([
      "pr",
      "list",
      "--repo",
      repo,
      "--state",
      "merged",
      "--base",
      "develop",
      "--limit",
      "100",
      "--json",
      "number,title,body,labels,mergeCommit,mergedAt,url",
    ])
  );

  const groupedItems = {
    New: [],
    Improved: [],
    Fixed: [],
  };

  for (const pr of pullRequests) {
    const mergeCommit = pr.mergeCommit?.oid;
    if (!mergeCommit || shouldExcludePr(pr)) {
      continue;
    }

    if (!isAncestor(mergeCommit, headRef) || isAncestor(mergeCommit, baseRef)) {
      continue;
    }

    const items = extractUserFacingItems(pr.body);
    const category = categoryForPr(pr, items.length > 0);
    if (!category) {
      continue;
    }

    const releaseItems = items.length > 0 ? items : [fallbackItemFromTitle(pr.title)];

    for (const item of releaseItems) {
      groupedItems[category].push(`${item} (#${pr.number})`);
    }
  }

  const itemCount = Object.values(groupedItems).reduce(
    (total, items) => total + items.length,
    0
  );

  if (itemCount === 0) {
    throw new Error(
      "No user-facing changelog items found between main and develop."
    );
  }

  const slug = `${date}-${sanitizeSlug(version)}`;
  const fileName = `${slug}.md`;
  const filePath = join(CHANGELOG_DIR, fileName);

  if (!existsSync(CHANGELOG_DIR)) {
    throw new Error(`Missing changelog directory: ${CHANGELOG_DIR}`);
  }

  writeFileSync(
    filePath,
    markdownForEntry({ version, title, summary, groupedItems })
  );
  upsertIndexEntry({ slug, date, version, title, summary, fileName });

  console.log(`Generated ${filePath} with ${itemCount} user-facing items.`);
}

main();
