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
    slug: "2026-02-22-v0.3.0",
    date: "2026-02-22",
    version: "v0.3.0",
    title: "Landing SEO + Changelog",
    summary:
      "Nueva landing para mejorar SEO, listado movido a /allMethods y changelog navegable por articulo.",
    fileName: "2026-02-22-v0.3.0.md",
  },
  {
    slug: "2026-02-20-v0.2.2",
    date: "2026-02-20",
    version: "v0.2.2",
    title: "Mejoras de navegacion",
    summary:
      "Ajustes de menu y legibilidad para reducir friccion entre exploracion y uso.",
    fileName: "2026-02-20-v0.2.2.md",
  },
  {
    slug: "2026-02-18-v0.2.1",
    date: "2026-02-18",
    version: "v0.2.1",
    title: "Optimizaciones de rendimiento",
    summary:
      "Menos renderizados redundantes y mejor respuesta inicial en vistas de alto trafico.",
    fileName: "2026-02-18-v0.2.1.md",
  },
  {
    slug: "2026-02-14-v0.2.0",
    date: "2026-02-14",
    version: "v0.2.0",
    title: "Filtros y busqueda avanzada",
    summary:
      "Nuevos filtros por categoria, skill y riesgo para acelerar el descubrimiento de metodos utiles.",
    fileName: "2026-02-14-v0.2.0.md",
  },
  {
    slug: "2026-02-10-v0.1.1",
    date: "2026-02-10",
    version: "v0.1.1",
    title: "Estabilidad general",
    summary:
      "Correcciones de rutas protegidas y mejoras de resiliencia ante errores de carga.",
    fileName: "2026-02-10-v0.1.1.md",
  },
  {
    slug: "2026-02-05-v0.1.0",
    date: "2026-02-05",
    version: "v0.1.0",
    title: "Base del producto",
    summary:
      "Release inicial con listado de metodos, vista de detalle y base de autenticacion.",
    fileName: "2026-02-05-v0.1.0.md",
  },
];

export const changelogEntries = [...entries].sort((a, b) =>
  b.date.localeCompare(a.date)
);

export const latestChangelogEntries = changelogEntries.slice(0, 5);

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
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

