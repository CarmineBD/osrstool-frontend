import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { AnimatedProfitValue } from "@/components/AnimatedProfitValue";
import { PixelArtIcon } from "@/components/method-editor/MethodEditorPrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PUBLIC_BODY_CLASS,
  PUBLIC_ELEVATED_PANEL_CLASS,
  PUBLIC_LINK_CLASS,
  PUBLIC_PAGE_BACKGROUND_CLASS,
  PUBLIC_PANEL_CLASS,
  PUBLIC_SECTION_EYEBROW_CLASS,
  PUBLIC_SUBPANEL_CLASS,
} from "@/components/public-page/publicPageStyles";
import {
  formatChangelogDate,
  latestChangelogEntries,
} from "@/content/changelog";
import { useSeo } from "@/hooks/useSeo";
import {
  fetchItems,
  fetchTrendingProfitMethods,
  type Item,
  type Method,
  type Variant,
} from "@/lib/api";
import { getItemsQueryKey } from "@/lib/queryKeys";
import {
  QUERY_REFETCH_INTERVAL_MS,
  QUERY_STALE_TIME_MS,
} from "@/lib/queryRefresh";
import { cn, formatPercent } from "@/lib/utils";

const SEO_TITLE = "OSRSTool | OSRS Money Making Methods";
const SEO_DESCRIPTION =
  "Find OSRS money making methods with clear filters, fast comparisons, and live product updates.";
const SEO_KEYWORDS =
  "osrs tool, osrs money making, old school runescape gp, osrs methods, osrs moneymaking";
const TRENDING_METHODS_LIMIT = 6;
const TRENDING_PROFIT_QUERY_KEY = [
  "methods",
  "trending-profit",
  { window: "1h", mode: "reliable", variants: "all" },
] as const;

const FEATURE_ITEMS = [
  {
    title: "Advanced filters",
    description:
      "Filter by category, click intensity, risk level, and skills to find methods that match your playstyle.",
  },
  {
    title: "Method history",
    description:
      "Review profit-per-hour history to spot trends and market stability before committing.",
  },
  {
    title: "Tailored to your account",
    description:
      "Use your account skills to surface the best methods you can do right now.",
  },
  {
    title: "Live data",
    description:
      "Prices and profit values refresh every 60 seconds so you can act on current market conditions.",
  },
  {
    title: "Real-world viability",
    description:
      "Check advanced market impact metrics to estimate whether a method is practical at scale.",
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
  variantIconUrl,
}: {
  method: Method;
  index: number;
  variantIconUrl?: string;
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
      className={`${PUBLIC_ELEVATED_PANEL_CLASS} block h-full p-4 text-left transition-[border-color,background-color,box-shadow] hover:border-brand/25 hover:bg-surface-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 sm:p-5`}
    >
      <article className="flex min-h-[108px] flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary" size="sm" className="font-semibold">
            #{index + 1}
          </Badge>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-start gap-2.5">
              <PixelArtIcon
                src={variantIconUrl}
                alt={variant?.label ? `${variant.label} icon` : ""}
                className="mt-0.5 h-[30px] w-[30px]"
              />
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-base font-medium leading-5 text-link">
                  {method.name}
                </h2>
                {variant?.label ? (
                  <div className="mt-1">
                    <p className="line-clamp-1 text-xs font-medium leading-4 text-muted-foreground">
                      {variant.label}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="shrink-0 self-center text-right">
            <p className="whitespace-nowrap text-sm font-bold leading-tight text-foreground">
              {typeof highProfit === "number" ? (
                <AnimatedProfitValue value={highProfit} />
              ) : (
                "N/A"
              )}
            </p>
            <p
              className={cn(
                "mt-1 flex items-center justify-end gap-1 whitespace-nowrap text-sm font-semibold leading-none",
                growthIsNegative ? "text-danger" : "text-success",
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
  const trendingCards = useMemo(
    () =>
      methods.map((method, index) => ({
        method,
        index,
        variant: getTrendingVariant(method),
      })),
    [methods],
  );
  const variantIconIds = useMemo(
    () =>
      Array.from(
        new Set(
          trendingCards
            .map(({ variant }) => variant?.icon_id)
            .filter((iconId): iconId is number => Number.isInteger(iconId)),
        ),
      ).sort((a, b) => a - b),
    [trendingCards],
  );
  const { data: variantIcons = {} } = useQuery<Record<number, Item>>({
    queryKey: getItemsQueryKey(variantIconIds),
    queryFn: () => fetchItems(variantIconIds),
    enabled: variantIconIds.length > 0,
    staleTime: QUERY_STALE_TIME_MS,
  });
  const isInitialLoading = isLoading || (isFetching && !data);

  return (
    <section
      aria-labelledby="trending-profit-heading"
      className="mx-auto w-full max-w-md"
    >
      <div className="mb-4 flex items-center justify-center gap-2 text-center">
        <TrendingUp className="h-5 w-5 text-brand" />
        <h2
          id="trending-profit-heading"
          className={PUBLIC_SECTION_EYEBROW_CLASS}
        >
          Trending profit
        </h2>
      </div>

      {isInitialLoading ? (
        <div className={`${PUBLIC_ELEVATED_PANEL_CLASS} p-4 sm:p-5`}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-10 rounded-md" />
            <Skeleton className="h-5 w-5" />
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <div className="flex items-start gap-2.5">
                <Skeleton className="mt-0.5 h-[30px] w-[30px]" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-5 w-4/5" />
                  <div className="mt-2">
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            </div>
            <div className="shrink-0 self-center text-right">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2 ml-auto h-4 w-16" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div
          className={`${PUBLIC_ELEVATED_PANEL_CLASS} p-5 text-sm text-muted-foreground`}
        >
          Trending methods are unavailable right now.
        </div>
      ) : methods.length === 0 ? (
        <div
          className={`${PUBLIC_ELEVATED_PANEL_CLASS} p-5 text-sm text-muted-foreground`}
        >
          No trending methods are available yet.
        </div>
      ) : (
        <Carousel
          opts={{ align: "center", loop: methods.length > 1 }}
          className="mx-auto w-full px-12"
        >
          <CarouselContent className="-ml-3">
            {trendingCards.map(({ method, index, variant }) => (
              <CarouselItem key={method.id} className="basis-full pl-3">
                <TrendingMethodCard
                  method={method}
                  index={index}
                  variantIconUrl={
                    variant?.icon_id
                      ? variantIcons[variant.icon_id]?.iconUrl
                      : undefined
                  }
                />
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
    <div className={PUBLIC_PAGE_BACKGROUND_CLASS}>
      <header className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-18 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Welcome to OSRSTool
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-foreground sm:text-6xl">
            Make money and train efficiently with real-time data.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-2xl">
            OSRSTool is a real-time decision tool for exploring money making and
            training methods that fit each account&apos;s stats.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-brand text-brand-foreground shadow-sm ring-1 ring-black/10 hover:bg-brand hover:shadow-md"
            >
              <Link to="/allMethods">Explore money making methods</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/skilling">Explore skilling methods</Link>
            </Button>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <TrendingMethodsCarousel />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 sm:px-10">
        <section id="who-it-is-for" className={`${PUBLIC_PANEL_CLASS} p-8`}>
          <h2 className="text-2xl font-bold text-foreground">Who it is for</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <article className={`${PUBLIC_SUBPANEL_CLASS} p-5`}>
              <h3 className="font-semibold text-foreground">New players</h3>
              <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
                Find practical methods without spending hours jumping between
                guides, videos, and spreadsheets.
              </p>
            </article>
            <article className={`${PUBLIC_SUBPANEL_CLASS} p-5`}>
              <h3 className="font-semibold text-foreground">
                Advanced players
              </h3>
              <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
                Optimize your time with the best method you can currently do
                based on GP/hr, XP/hr, % AFK, and market stability.
              </p>
            </article>
            <article className={`${PUBLIC_SUBPANEL_CLASS} p-5`}>
              <h3 className="font-semibold text-foreground">
                Low-attention players
              </h3>
              <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
                Surface methods that demand less attention while still helping
                you profit or train.
              </p>
            </article>
            <article className={`${PUBLIC_SUBPANEL_CLASS} p-5`}>
              <h3 className="font-semibold text-foreground">
                Players focused on GP
              </h3>
              <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
                Spend time only on methods that currently deliver the best
                hourly returns, backed by fresh and reliable data.
              </p>
            </article>
            <article className={`${PUBLIC_SUBPANEL_CLASS} p-5`}>
              <h3 className="font-semibold text-foreground">
                Players focused on XP
              </h3>
              <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
                Level efficiently with realistic methods that fit your current
                account progression.
              </p>
            </article>
          </div>
        </section>

        <section id="features" className={`${PUBLIC_PANEL_CLASS} p-8`}>
          <h2 className="text-2xl font-bold text-foreground">Features</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {FEATURE_ITEMS.map((item) => (
              <article
                key={item.title}
                className={`${PUBLIC_SUBPANEL_CLASS} p-5`}
              >
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className={`${PUBLIC_PANEL_CLASS} p-8`}>
          <h2 className="text-2xl font-bold text-foreground">How it works</h2>
          <ol className={`mt-4 grid gap-3 ${PUBLIC_BODY_CLASS} sm:grid-cols-2`}>
            <li className={`${PUBLIC_SUBPANEL_CLASS} p-4`}>
              1. Open{" "}
              <Link to="/allMethods" className={PUBLIC_LINK_CLASS}>
                /allMethods
              </Link>
              .
            </li>
            <li className={`${PUBLIC_SUBPANEL_CLASS} p-4`}>
              2. Apply filters for category, skill, and risk level.
            </li>
            <li className={`${PUBLIC_SUBPANEL_CLASS} p-4`}>
              3. Compare methods and open the detail view to review
              requirements and variants.
            </li>
            <li className={`${PUBLIC_SUBPANEL_CLASS} p-4`}>
              4. Check the changelog to see recent product improvements.
            </li>
          </ol>
        </section>

        <section id="changelog" className={`${PUBLIC_PANEL_CLASS} p-8`}>
          <h2 className="text-2xl font-bold text-foreground">
            Latest changelog entries
          </h2>
          <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
            The three most recent product updates.
          </p>

          <div className="mt-5 grid gap-3">
            {latestChangelogEntries.map((entry) => (
              <article
                key={entry.slug}
                className={`${PUBLIC_SUBPANEL_CLASS} p-5`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                  {formatChangelogDate(entry.date)} | {entry.version}
                </p>
                <h3 className="mt-2 text-lg font-bold text-foreground">
                  {entry.title}
                </h3>
                <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>{entry.summary}</p>
                <Link
                  to={`/changelog/${entry.slug}`}
                  className={`mt-3 inline-block text-sm ${PUBLIC_LINK_CLASS}`}
                >
                  Read the full article
                </Link>
              </article>
            ))}
          </div>
          <Link
            to="/changelog"
            className={`mt-6 inline-block text-sm ${PUBLIC_LINK_CLASS}`}
          >
            View all updates
          </Link>
        </section>
      </main>
    </div>
  );
}
