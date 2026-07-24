import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  PUBLIC_BODY_CLASS,
  PUBLIC_LINK_CLASS,
  PUBLIC_PANEL_CLASS,
  PUBLIC_SUBPANEL_CLASS,
  PUBLIC_TITLE_CLASS,
} from "@/components/public-page/publicPageStyles";
import { changelogEntries, formatChangelogDate } from "@/content/changelog";
import { useSeo } from "@/hooks/useSeo";

const SEO_TITLE = "OSRSTool Updates";
const SEO_DESCRIPTION =
  "Complete release history and product updates for OSRSTool.";
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
      <div className={`${PUBLIC_PANEL_CLASS} p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={PUBLIC_TITLE_CLASS}>All updates</h1>
            <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
              Release history and product updates for OSRSTool.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-4">
          {entries.map((entry) => (
            <article
              key={entry.slug}
              className={`${PUBLIC_SUBPANEL_CLASS} p-5`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                {formatChangelogDate(entry.date)} | {entry.version}
              </p>
              <h2 className="mt-2 text-xl font-bold text-foreground">{entry.title}</h2>
              <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>{entry.summary}</p>
              <Link
                to={`/changelog/${entry.slug}`}
                className={`mt-4 inline-block text-sm ${PUBLIC_LINK_CLASS}`}
              >
                Read update details
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
