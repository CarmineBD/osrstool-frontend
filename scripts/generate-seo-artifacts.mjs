import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const siteUrl = (process.env.SEO_SITE_URL ?? "https://www.rsmethods.com").replace(
  /\/$/,
  "",
);
const apiUrl = (process.env.SEO_API_URL ??
  "https://osrstool-backend-production.up.railway.app").replace(/\/$/, "");
const robotsDirective = process.env.VITE_ROBOTS?.trim();
const outputDirectory = path.resolve("dist");
const methodsEndpoint = `${apiUrl}/methods/search?enabled=true&variants=all`;
const SEO_FETCH_ATTEMPTS = 3;
const SEO_FETCH_RETRY_DELAY_MS = 1_000;
const staticPaths = [
  "/",
  "/allMethods",
  "/skilling",
  "/skilling/agility",
  "/skilling/attack",
  "/skilling/construction",
  "/skilling/cooking",
  "/skilling/crafting",
  "/skilling/defence",
  "/skilling/farming",
  "/skilling/firemaking",
  "/skilling/fishing",
  "/skilling/fletching",
  "/skilling/herblore",
  "/skilling/hunter",
  "/skilling/hitpoints",
  "/skilling/magic",
  "/skilling/mining",
  "/skilling/prayer",
  "/skilling/ranged",
  "/skilling/runecraft",
  "/skilling/sailing",
  "/skilling/slayer",
  "/skilling/smithing",
  "/skilling/thieving",
  "/skilling/woodcutting",
  "/wiki",
  "/changelog",
  "/privacy-policy",
  "/terms-of-use",
  "/cookies-and-local-storage",
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(value, maxLength = 155) {
  const text = plainText(value);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function xmlEscape(value) {
  return escapeHtml(value);
}

function addRobotsDirective(html) {
  if (!robotsDirective) return html;
  return html.replace(
    "</head>",
    `    <meta name="robots" content="${escapeHtml(robotsDirective)}" />\n  </head>`,
  );
}

function toPositiveNumber(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function fetchMethodPage(page) {
  let response;
  let lastError;

  for (let attempt = 1; attempt <= SEO_FETCH_ATTEMPTS; attempt += 1) {
    try {
      response = await fetch(`${methodsEndpoint}&page=${page}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt < SEO_FETCH_ATTEMPTS) {
        await new Promise((resolve) => {
          setTimeout(resolve, SEO_FETCH_RETRY_DELAY_MS * attempt);
        });
      }
    }
  }

  if (!response) {
    throw lastError;
  }

  if (!response.ok) {
    throw new Error(`SEO catalog request failed for page ${page}: HTTP ${response.status}`);
  }

  const payload = await response.json();
  const data = payload?.data;
  const meta = payload?.meta ?? data?.meta ?? {};
  const total = toPositiveNumber(data?.total ?? meta.total);
  const perPage = toPositiveNumber(
    data?.perPage ?? data?.pageSize ?? meta.perPage ?? meta.pageSize,
  );
  if (!Array.isArray(data?.methods) || total === undefined || perPage === undefined) {
    throw new Error(`SEO catalog response for page ${page} has an unexpected format.`);
  }

  return { methods: data.methods, total, perPage };
}

async function fetchAllMethodRows() {
  const firstPage = await fetchMethodPage(1);
  const totalPages = Math.ceil(firstPage.total / firstPage.perPage);
  const pageNumbers = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
  const remainingPages = [];
  const concurrency = 8;

  for (let index = 0; index < pageNumbers.length; index += concurrency) {
    const batch = pageNumbers.slice(index, index + concurrency);
    remainingPages.push(...(await Promise.all(batch.map(fetchMethodPage))));
  }

  return [firstPage, ...remainingPages].flatMap((page) => page.methods);
}

function methodSummary(method, variant) {
  const source = variant?.description || method.description;
  const fallback = `Explore requirements and practical guidance for ${method.name}, an Old School RuneScape ${method.category ?? ""} method.`;
  return shorten(source || fallback);
}

function buildMethodPage(template, method, variant, pathName) {
  const isVariantPage = Boolean(variant?.slug && pathName.endsWith(`/${variant.slug}`));
  const variantLabel = isVariantPage && variant?.label ? `: ${variant.label}` : "";
  const title = `${method.name}${variantLabel} | OSRS Method | RSMethods`;
  const description = methodSummary(method, variant);
  const canonical = `${siteUrl}${pathName}`;
  const guideText = plainText(variant?.description || method.description || description);
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: `${method.name}${variantLabel}`,
        description,
        mainEntityOfPage: canonical,
        about: {
          "@type": "VideoGame",
          name: "Old School RuneScape",
        },
        publisher: {
          "@type": "Organization",
          name: "RSMethods",
          url: siteUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "RSMethods", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "All methods", item: `${siteUrl}/allMethods` },
          { "@type": "ListItem", position: 3, name: `${method.name}${variantLabel}`, item: canonical },
        ],
      },
    ],
  }).replaceAll("<", "\\u003c");
  const seoHead = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    '<meta property="og:site_name" content="RSMethods" />',
    '<meta property="og:type" content="article" />',
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    ...(robotsDirective
      ? [`<meta name="robots" content="${escapeHtml(robotsDirective)}" />`]
      : []),
    `<script type="application/ld+json">${structuredData}</script>`,
  ].join("\n    ");
  const visibleContent = `<main data-seo-prerendered="true"><article><p>OSRS money making method</p><h1>${escapeHtml(method.name)}${escapeHtml(variantLabel)}</h1><p>${escapeHtml(description)}</p>${guideText ? `<section><h2>Method guide</h2><p>${escapeHtml(guideText)}</p></section>` : ""}<p><a href="/allMethods">Browse all OSRS methods</a></p></article></main>`;

  const withoutDefaultSeo = template
    .replace(/<meta\s+(?:name|property)="(?:description|keywords|robots|twitter:[^"]+|og:[^"]+)"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, "");

  return withoutDefaultSeo
    .replace(/<title>[\s\S]*?<\/title>/i, seoHead)
    .replace('<div id="root"></div>', `<div id="root">${visibleContent}</div>`);
}

async function writeMethodPage(template, method, variant, pathName) {
  const outputPath = path.join(outputDirectory, pathName.slice(1), "index.html");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buildMethodPage(template, method, variant, pathName));
}

async function main() {
  const template = addRobotsDirective(
    await readFile(path.join(outputDirectory, "index.html"), "utf8"),
  );
  await writeFile(path.join(outputDirectory, "index.html"), template);
  const rows = await fetchAllMethodRows();
  const methods = new Map();
  const pages = new Map();

  for (const row of rows) {
    if (row?.enabled === false || !row?.slug || !row.name) continue;
    const existing = methods.get(row.slug) ?? { ...row, variants: [] };
    const variant = row.variants?.[0];
    if (variant?.slug && !existing.variants.some((item) => item.slug === variant.slug)) {
      existing.variants.push(variant);
    }
    methods.set(row.slug, existing);
  }

  for (const method of methods.values()) {
    const defaultVariant = method.variants[0];
    pages.set(`/moneyMakingMethod/${method.slug}`, { method, variant: defaultVariant });
    if (method.variantCount > 1) {
      for (const variant of method.variants) {
        pages.set(`/moneyMakingMethod/${method.slug}/${variant.slug}`, { method, variant });
      }
    }
  }

  await Promise.all(
    [...pages.entries()].map(([pathName, { method, variant }]) =>
      writeMethodPage(template, method, variant, pathName),
    ),
  );

  const sitemapUrls = [...staticPaths, ...pages.keys()];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls
    .map((pathName) => `  <url><loc>${xmlEscape(`${siteUrl}${pathName}`)}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  await writeFile(path.join(outputDirectory, "sitemap.xml"), sitemap);
  if (robotsDirective?.toLowerCase().includes("noindex")) {
    await writeFile(
      path.join(outputDirectory, "robots.txt"),
      "User-agent: *\nAllow: /\n",
    );
  }
  console.log(`Generated sitemap and ${pages.size} prerendered method pages from ${methods.size} methods.`);
}

await main();
