import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Item } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatChangelogDate,
  getChangelogContentBySlug,
  getChangelogEntryBySlug,
} from "@/content/changelog";
import { useSeo } from "@/hooks/useSeo";

const EMPTY_ITEMS: Record<number, Item> = {};

export function ChangelogDetailPage() {
  const { slug = "" } = useParams();
  const entry = getChangelogEntryBySlug(slug);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useSeo({
    title: entry
      ? `${entry.version} | ${entry.title} | OSRSTool`
      : "Changelog no encontrado | OSRSTool",
    description: entry
      ? entry.summary
      : "La entrada de changelog solicitada no existe en OSRSTool.",
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
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Novedad no encontrada</h1>
          <p className="mt-2 text-sm text-slate-700">
            El articulo solicitado no existe o fue movido.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/">Volver a landing</Link>
            </Button>
            <Button asChild>
              <Link to="/allMethods">Ir a metodos</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {formatChangelogDate(entry.date)} | {entry.version}
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">{entry.title}</h1>
        <p className="mt-3 text-slate-700">{entry.summary}</p>

        {isLoading ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
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
            No se pudo cargar el contenido de esta entrada.
          </p>
        ) : (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="space-y-4 text-[15px] leading-7 text-slate-800 [&_h1]:text-2xl [&_h1]:font-black [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-slate-700">
              <Markdown content={content} items={EMPTY_ITEMS} />
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/">Volver a la landing</Link>
          </Button>
          <Button asChild>
            <Link to="/allMethods">Ver todos los metodos</Link>
          </Button>
        </div>
      </article>
    </section>
  );
}
