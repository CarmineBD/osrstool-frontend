import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Item } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PUBLIC_BODY_CLASS,
  PUBLIC_PANEL_CLASS,
  PUBLIC_SUBPANEL_CLASS,
  PUBLIC_TITLE_CLASS,
} from "@/components/public-page/publicPageStyles";
import {
  formatChangelogDate,
  getChangelogContentBySlug,
  getChangelogEntryBySlug,
} from "@/content/changelog";
import { useSeo } from "@/hooks/useSeo";

const EMPTY_ITEMS: Record<number, Item> = {};

export function ChangelogDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const entry = getChangelogEntryBySlug(slug);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/changelog");
  };

  useSeo({
    title: entry
      ? `${entry.version} | ${entry.title} | RSMethods`
      : "Changelog entry not found | RSMethods",
    description: entry
      ? entry.summary
      : "The requested changelog entry does not exist in RSMethods.",
    path: entry ? `/changelog/${entry.slug}` : "/changelog",
  });

  useEffect(() => {
    let isMounted = true;

    if (!entry) {
      setContent(null);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);

    void getChangelogContentBySlug(entry.slug)
      .then((value) => {
        if (!isMounted) {
          return;
        }
        setContent(value);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setContent(null);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [entry]);

  if (!entry) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className={`${PUBLIC_SUBPANEL_CLASS} p-8 text-center shadow-sm`}>
          <h1 className="text-2xl font-bold text-foreground">
            Update not found
          </h1>
          <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
            The requested article does not exist or has moved.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
            <Button asChild>
              <Link to="/allMethods">Browse methods</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <article className={`${PUBLIC_PANEL_CLASS} p-8`}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          {formatChangelogDate(entry.date)} | {entry.version}
        </p>
        <h1 className={`mt-2 ${PUBLIC_TITLE_CLASS}`}>{entry.title}</h1>
        <p className={`mt-3 ${PUBLIC_BODY_CLASS}`}>{entry.summary}</p>

        {isLoading ? (
          <div className={`mt-8 ${PUBLIC_SUBPANEL_CLASS} p-6`}>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-10/12" />
              <Skeleton className="h-4 w-9/12" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          </div>
        ) : content === null ? (
          <p className="mt-8 text-sm text-destructive">
            Unable to load this entry.
          </p>
        ) : (
          <div className={`mt-8 ${PUBLIC_SUBPANEL_CLASS} p-6`}>
            <div className="space-y-4 text-[15px] leading-7 text-foreground [&_h1]:text-2xl [&_h1]:font-black [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground">
              <Markdown content={content} items={EMPTY_ITEMS} />
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={handleGoBack}>
            Back
          </Button>
        </div>
      </article>
    </section>
  );
}
