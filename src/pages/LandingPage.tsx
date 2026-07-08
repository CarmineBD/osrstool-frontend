import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VariantMembershipBadge } from "@/components/VariantMembershipBadge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatChangelogDate,
  latestChangelogEntries,
} from "@/content/changelog";
import { useSeo } from "@/hooks/useSeo";
import {
  fetchTrendingProfitMethods,
  type Method,
  type Variant,
} from "@/lib/api";
import {
  QUERY_REFETCH_INTERVAL_MS,
  QUERY_STALE_TIME_MS,
} from "@/lib/queryRefresh";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

const SEO_TITLE = "OSRSTool | Metodos de Money Making para OSRS";
const SEO_DESCRIPTION =
  "OSRSTool te ayuda a encontrar metodos de money making en Old School RuneScape con filtros claros, comparacion rapida y novedades del producto.";
const SEO_KEYWORDS =
  "osrs tool, money making osrs, old school runescape gp, metodos osrs, osrs moneymaking";
const TRENDING_METHODS_LIMIT = 6;
const TRENDING_PROFIT_QUERY_KEY = [
  "methods",
  "trending-profit",
  { window: "1h", mode: "reliable", variants: "all" },
] as const;

const FEATURE_ITEMS = [
  {
    title: "Filtros avanzados",
    description:
      "Filtra por categoria, intensidad de clicks, nivel de riesgo y skills para encontrar metodos alineados a tu estilo.",
  },
  {
    title: "Track de métodos",
    description:
      "Conoce el historial de profit/hr que ha tenido cada método para identificar tendencias y estabilidad en el mercado.",
  },
  {
    title: "Adaptados a tu usuario",
    description:
      "Filtra métodos por skills de tu usuario para conocer los mejores métodos que tienes disponible actualmente",
  },
  {
    title: "Datos reales",
    description:
      "Todos los precios y profit de metodos se actualizan cada 60 segundos para tener la información más fresca y real actualmente",
  },
  {
    title: "Fidelidad",
    description:
      "Conoce la factibilidad real de hacer un método con métricas avanzadas de impacto en el mercado.",
  },
];

function getVariantHref(method: Method, variant?: Variant): string {
  const variantSlug = variant?.slug ?? variant?.id;
  const variantCount = method.variantCount ?? method.variants.length;

  if (variantCount > 1 && variantSlug) {
    return `/moneyMakingMethod/${method.slug}/${variantSlug}`;
  }

  return `/moneyMakingMethod/${method.slug}`;
}

function getGrowthAbs(variant?: Variant): number | undefined {
  if (typeof variant?.profitGrowth?.growthAbs === "number") {
    return variant.profitGrowth.growthAbs;
  }

  return variant?.profitGrowth?.selectedGrowthAbs;
}

function getGrowthPct(variant?: Variant): number | undefined {
  if (typeof variant?.profitGrowth?.growthPct === "number") {
    return variant.profitGrowth.growthPct;
  }

  if (typeof variant?.profitGrowth?.selectedGrowthPct === "number") {
    return variant.profitGrowth.selectedGrowthPct;
  }

  return typeof variant?.trendLastHour === "number"
    ? variant.trendLastHour
    : variant?.trendLast24h;
}

function getGrowthScore(variant: Variant): number {
  const growthAbs = getGrowthAbs(variant);
  if (typeof growthAbs === "number") return growthAbs;

  return getGrowthPct(variant) ?? Number.NEGATIVE_INFINITY;
}

function getTrendingVariant(method: Method): Variant | undefined {
  return method.variants.reduce<Variant | undefined>((best, variant) => {
    if (!best) return variant;
    return getGrowthScore(variant) > getGrowthScore(best) ? variant : best;
  }, undefined);
}

function TrendingMethodCard({
  method,
  index,
}: {
  method: Method;
  index: number;
}) {
  const variant = getTrendingVariant(method);
  const growthPct = getGrowthPct(variant);
  const growthAbs = getGrowthAbs(variant);
  const growthIsNegative =
    (typeof growthPct === "number" && growthPct < 0) ||
    (growthPct === undefined && typeof growthAbs === "number" && growthAbs < 0);
  const highProfit = variant?.highProfit;
  const TrendIcon = growthIsNegative ? TrendingDown : TrendingUp;

  return (
    <Link
      to={getVariantHref(method, variant)}
      className="block h-full rounded-lg border border-slate-200 bg-white/95 p-5 text-left shadow-sm transition-shadow hover:shadow-[0_0_0_1px_rgba(245,158,11,0.18),0_10px_28px_rgba(15,23,42,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      <article className="flex min-h-[120px] flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
            #{index + 1}
          </span>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-500" />
        </div>

        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-xl font-black leading-tight text-slate-950">
              {method.name}
            </h2>
            {variant?.label ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="line-clamp-1 text-sm font-semibold text-slate-600">
                  {variant.label}
                </p>
                {variant ? (
                  <VariantMembershipBadge members={variant.members} compact />
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="shrink-0 space-y-1 text-right ">
            <p className="whitespace-nowrap text-lg font-black leading-none text-slate-950">
              {typeof highProfit === "number"
                ? `${formatNumber(highProfit)}/hr`
                : "N/A"}
            </p>
            <p
              className={cn(
                "flex items-center justify-end gap-1 whitespace-nowrap text-base font-black leading-none",
                growthIsNegative ? "text-red-700" : "text-emerald-700",
              )}
            >
              {typeof growthPct === "number" ? formatPercent(growthPct) : "N/A"}
              <TrendIcon className="h-4 w-4 shrink-0" />
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}

function TrendingMethodsCarousel() {
  const { data, error, isLoading, isFetching } = useQuery<Method[], Error>({
    queryKey: TRENDING_PROFIT_QUERY_KEY,
    queryFn: fetchTrendingProfitMethods,
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
    retry: false,
  });

  const methods = useMemo(
    () => (data ?? []).slice(0, TRENDING_METHODS_LIMIT),
    [data],
  );
  const isInitialLoading = isLoading || (isFetching && !data);

  return (
    <section
      aria-labelledby="trending-profit-heading"
      className="mx-auto w-full max-w-md"
    >
      <div className="mb-4 flex items-center justify-center gap-2 text-center">
        <TrendingUp className="h-5 w-5 text-amber-700" />
        <h2
          id="trending-profit-heading"
          className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700"
        >
          Trending profit
        </h2>
      </div>

      {isInitialLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-9 rounded-md" />
            <Skeleton className="h-5 w-5" />
          </div>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-7 w-4/5" />
              <Skeleton className="mt-2 h-4 w-1/2" />
            </div>
            <div className="flex shrink-0 gap-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-14" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-slate-200 bg-white/90 p-5 text-sm text-slate-700 shadow-sm">
          No se pudieron cargar las tendencias ahora mismo.
        </div>
      ) : methods.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white/90 p-5 text-sm text-slate-700 shadow-sm">
          No hay metodos trending disponibles.
        </div>
      ) : (
        <Carousel
          opts={{ align: "center", loop: methods.length > 1 }}
          className="mx-auto w-full px-12"
        >
          <CarouselContent className="-ml-3">
            {methods.map((method, index) => (
              <CarouselItem key={method.id} className="basis-full pl-3">
                <TrendingMethodCard method={method} index={index} />
              </CarouselItem>
            ))}
          </CarouselContent>
          {methods.length > 1 ? (
            <>
              <CarouselPrevious className="left-1 top-1/2 -translate-y-1/2" />
              <CarouselNext className="right-1 top-1/2 -translate-y-1/2" />
            </>
          ) : null}
        </Carousel>
      )}
    </section>
  );
}

export function LandingPage() {
  useSeo({
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    path: "/",
    keywords: SEO_KEYWORDS,
  });

  return (
    <div className="bg-[radial-gradient(circle_at_top_right,_#fef9c3,_#fff,_#e2e8f0_60%)]">
      <header className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-18 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Welcome to OSRSTool
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-slate-900 sm:text-6xl">
            Make money and train efficiently with real-time data.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-700 sm:text-2xl">
            OSRSTool es una herramienta avanzada de tiempo real para explorar
            métodos de training / money making adaptadas al las stats de cada
            usuario.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              <Link to="/allMethods">Explorar Money making methods</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#">Explorar Training methods</a>
            </Button>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <TrendingMethodsCarousel />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 sm:px-10">
        {/* <section
          id="que-es-osrstool"
          className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">Que es OSRSTool</h2>
          <p className="mt-3 text-slate-700">
            OSRSTool centraliza métodos de money making y training en un solo sitio para responder una pregunta simple: “¿Qué me conviene hacer ahora?” Filtras por tu perfil, comparas variantes y eliges con información actualizada y accionable.
          </p>
        </section> */}

        <section
          id="para-quien"
          className="rounded-2xl border border-slate-200 bg-white/85 p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">Para quien</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">Jugadores nuevos</h3>
              <p className="mt-2 text-sm text-slate-700">
                Encuentra los mejores métodos viables sin perder horas saltando
                entre guías, vídeos y hojas de cálculo.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">
                Jugadores avanzados
              </h3>
              <p className="mt-2 text-sm text-slate-700">
                Optimiza tu tiempo haciendo el mejor método que peudas hacer
                actualmente según GP/h, XP/h, AFKiness y estabilidad del
                mercado.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">Lazy players</h3>
              <p className="mt-2 text-sm text-slate-700">
                Encuentra métodos con bajo requerimiento de atención por hora
                para hacer dinero o entrenar.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">
                Players focused on GP
              </h3>
              <p className="mt-2 text-sm text-slate-700">
                Haz solo aquellos métodos que actualmente sauqen mejor
                rendimiento por hora con data fresca y confiable, sin perder
                tiempo investigando cada precio.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">
                Players focused on XP
              </h3>
              <p className="mt-2 text-sm text-slate-700">
                Sube de nivel de manera eficiente y realista con métodos que se
                ajusten a tu nivel actual.
              </p>
            </article>
          </div>
        </section>

        <section
          id="features"
          className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">Features</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {FEATURE_ITEMS.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-slate-200 p-5"
              >
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-700">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="como-funciona"
          className="rounded-2xl border border-slate-200 bg-white/85 p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">Como funciona</h2>
          <ol className="mt-4 grid gap-3 text-slate-700 sm:grid-cols-2">
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              1. Entra a{" "}
              <Link to="/allMethods" className="font-semibold underline">
                /allMethods
              </Link>
              .
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              2. Aplica filtros por categoria, skill y nivel de riesgo.
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              3. Compara metodos y abre el detalle para revisar requisitos y
              variantes.
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              4. Consulta el changelog para conocer mejoras recientes del
              producto.
            </li>
          </ol>
        </section>

        <section
          id="changelog"
          className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900">
            Changelog de novedades
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            Ultimas 3 novedades publicadas.
          </p>

          <div className="mt-5 grid gap-3">
            {latestChangelogEntries.map((entry) => (
              <article
                key={entry.slug}
                className="rounded-xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {formatChangelogDate(entry.date)} | {entry.version}
                </p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  {entry.title}
                </h3>
                <p className="mt-2 text-sm text-slate-700">{entry.summary}</p>
                <Link
                  to={`/changelog/${entry.slug}`}
                  className="mt-3 inline-block text-sm font-semibold text-slate-900 underline"
                >
                  Leer articulo completo
                </Link>
              </article>
            ))}
          </div>
          <Link
            to="/changelog"
            className="mt-6 inline-block text-sm font-semibold text-slate-900 underline"
          >
            Ver todas las novedades
          </Link>
        </section>
      </main>
    </div>
  );
}
