import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { changelogEntries, formatChangelogDate } from "@/content/changelog";
import { useSeo } from "@/hooks/useSeo";

const SEO_TITLE = "Novedades de OSRSTool";
const SEO_DESCRIPTION =
  "Listado completo de novedades y cambios de producto en OSRSTool.";
const ENTRIES_PER_PAGE = 5;

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function ChangelogListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageCount = Math.max(
    1,
    Math.ceil(changelogEntries.length / ENTRIES_PER_PAGE)
  );
  const page = Math.min(parsePage(searchParams.get("page")), pageCount);
  const startIndex = (page - 1) * ENTRIES_PER_PAGE;
  const entries = changelogEntries.slice(startIndex, startIndex + ENTRIES_PER_PAGE);

  useSeo({
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    path: page > 1 ? `/changelog?page=${page}` : "/changelog",
  });

  const onPageChange = (nextPage: number) => {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      if (nextPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(nextPage));
      }
      return params;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Todas las novedades</h1>
            <p className="mt-2 text-sm text-slate-700">
              Historial de cambios y lanzamientos de OSRSTool.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Volver a la landing</Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-4">
          {entries.map((entry) => (
            <article
              key={entry.slug}
              className="rounded-xl border border-slate-200 bg-slate-50 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {formatChangelogDate(entry.date)} | {entry.version}
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">{entry.title}</h2>
              <p className="mt-2 text-sm text-slate-700">{entry.summary}</p>
              <Link
                to={`/changelog/${entry.slug}`}
                className="mt-4 inline-block text-sm font-semibold text-slate-900 underline"
              >
                Ver detalle de la novedad
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
        </div>
      </div>
    </section>
  );
}
