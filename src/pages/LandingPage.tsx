import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { AnimatedProfitValue } from "@/components/AnimatedProfitValue";
import { LandingMethodFinder } from "@/components/LandingMethodFinder";
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
  LANDING_ELEVATED_PANEL_CLASS,
  LANDING_PANEL_CLASS,
  LANDING_SUBPANEL_CLASS,
  PUBLIC_BODY_CLASS,
  PUBLIC_LINK_CLASS,
  PUBLIC_PAGE_BACKGROUND_CLASS,
  PUBLIC_SECTION_EYEBROW_CLASS,
} from "@/components/public-page/publicPageStyles";
import {
  formatChangelogDate,
  latestChangelogEntries,
} from "@/content/changelog";
import { useSeo } from "@/hooks/useSeo";
import { useUsername } from "@/contexts/UsernameContext";
import {
  fetchIconRecords,
  fetchTrendingProfitMethods,
  getIconReferenceKey,
  normalizeIconSource,
  type IconRecord,
  type Method,
  type Variant,
} from "@/lib/api";
import {
  QUERY_REFETCH_INTERVAL_MS,
  QUERY_STALE_TIME_MS,
} from "@/lib/queryRefresh";
import { cn, formatPercent } from "@/lib/utils";

const SEO_TITLE = "RSMethods | OSRS Money Making Methods";
const SEO_DESCRIPTION =
  "Find OSRS methods matched to your account with live GP/hr, XP/hr, and market signals.";
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
    title: "Real methods. Real numbers.",
    description:
      "Explore deeply detailed money-making and training methods with live data, realistic rates, and advanced metrics to see what actually works.",
    videoFileName: "feature-compare.webm",
    reversed: false,
  },
  {
    title: "Built around your stats.",
    description:
      "Enter your OSRS username to pull your stats and instantly surface the best methods you can actually do.",
    videoFileName: "feature-trends.webm",
    reversed: true,
  },
  {
    title: "Turn goals into a roadmap.",
    description:
      "Set a GP or skill goal and get a step-by-step roadmap tailored to your stats, with precise time, XP, and profit estimates.",
    videoFileName: "feature-recommendations.webm",
    reversed: false,
  },
] as const;

const AMBIENT_GRADIENT_ORBS = [
  "landing-ambient-gradient__orb--one",
  "landing-ambient-gradient__orb--three",
  "landing-ambient-gradient__orb--four",
];

function FeatureMediaPlaceholder({
  title,
  videoFileName,
}: {
  title: string;
  videoFileName: string;
}) {
  return (
    <figure
      className={`${LANDING_SUBPANEL_CLASS} relative flex aspect-video min-h-52 items-end overflow-hidden p-5 sm:min-h-64`}
      aria-label={`${title} product preview`}
    >
      {/*
        Replace this placeholder with the matching media asset: feature-compare.webm,
        feature-trends.webm, or feature-recommendations.webm. Use a video with
        autoPlay, muted, loop, playsInline, preload="metadata", and respect
        prefers-reduced-motion before starting playback.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,var(--surface-highlight),transparent_38%),linear-gradient(135deg,transparent_0%,var(--surface-page-accent)_100%)] opacity-70"
      />
      <figcaption className="relative text-sm font-medium text-muted-foreground">
        Product preview coming soon
        <span className="mt-1 block text-xs text-brand/80">
          {videoFileName}
        </span>
      </figcaption>
    </figure>
  );
}

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
      className={`${LANDING_ELEVATED_PANEL_CLASS} block h-full p-4 text-left transition-[border-color,background-color,box-shadow] hover:border-brand/25 hover:bg-surface-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 sm:p-5`}
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
  const { player } = useUsername();
  const { data, error, isLoading, isFetching } = useQuery<Method[], Error>({
    queryKey: [...TRENDING_PROFIT_QUERY_KEY, player],
    queryFn: () => fetchTrendingProfitMethods(player ?? undefined),
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
  const variantIconReferences = useMemo(
    () =>
      trendingCards.flatMap(({ variant }) =>
        variant && Number.isInteger(variant.icon_id)
          ? [
              {
                id: variant.icon_id as number,
                source: normalizeIconSource(variant.iconSource),
              },
            ]
          : [],
      ),
    [trendingCards],
  );
  const { data: variantIcons = {} } = useQuery<Record<string, IconRecord>>({
    queryKey: [
      "iconRecords",
      variantIconReferences.map(getIconReferenceKey).sort(),
    ],
    queryFn: () => fetchIconRecords(variantIconReferences),
    enabled: variantIconReferences.length > 0,
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
          Trending right now
        </h2>
      </div>

      {isInitialLoading ? (
        <div className={`${LANDING_ELEVATED_PANEL_CLASS} p-4 sm:p-5`}>
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
          className={`${LANDING_ELEVATED_PANEL_CLASS} p-5 text-sm text-muted-foreground`}
        >
          Trending methods are unavailable right now.
        </div>
      ) : methods.length === 0 ? (
        <div
          className={`${LANDING_ELEVATED_PANEL_CLASS} p-5 text-sm text-muted-foreground`}
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
                      ? variantIcons[
                          getIconReferenceKey({
                            id: variant.icon_id,
                            source: normalizeIconSource(variant.iconSource),
                          })
                        ]?.iconUrl
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
    <div
      className={`${PUBLIC_PAGE_BACKGROUND_CLASS} relative isolate overflow-hidden`}
    >
      <div className="landing-ambient-gradient" aria-hidden="true">
        {AMBIENT_GRADIENT_ORBS.map((orbClass) => (
          <span
            key={orbClass}
            className={`landing-ambient-gradient__orb ${orbClass}`}
          />
        ))}
      </div>
      <span
        aria-hidden="true"
        className="landing-ambient-gradient__orb landing-ambient-gradient__orb--two landing-scroll-gradient"
      />

      <header className="relative z-10 mx-auto grid min-h-[82svh] w-full max-w-6xl items-center gap-10 px-6 py-24 sm:px-10 lg:min-h-[90svh] lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:py-28">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Welcome to RSMethods (Beta)
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-foreground sm:text-6xl">
            {/* Find your best OSRS method. */}
            Play smarter.
            <br></br>
            Earn more.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-2xl">
            Find the best realistic methods for your account with accurate
            real-time GP & XP rates.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-brand text-brand-foreground shadow-sm ring-1 ring-black/10 hover:bg-brand hover:shadow-md"
            >
              <Link to="/allMethods">Explore methods</Link>
            </Button>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <TrendingMethodsCarousel />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 sm:px-10">
        <div className={`${LANDING_PANEL_CLASS} p-8`}>
          <LandingMethodFinder />
        </div>

        <section id="features" className={`${LANDING_PANEL_CLASS} p-8`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Features
          </p>
          {/* <h2 className="mt-2 text-2xl font-bold text-foreground">
            Choose better methods, faster.
          </h2>
          <p className={`mt-3 max-w-2xl ${PUBLIC_BODY_CLASS}`}>
            RSMethods helps you compare methods, spot opportunities and find
            options that match how you want to play.
          </p> */}
          <div className="mt-10 space-y-16">
            {FEATURE_ITEMS.map((feature) => (
              <article
                key={feature.title}
                className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
              >
                <div className={feature.reversed ? "lg:order-2" : undefined}>
                  <h3 className="text-xl font-bold text-foreground sm:text-2xl">
                    {feature.title}
                  </h3>
                  <p className={`mt-3 max-w-lg ${PUBLIC_BODY_CLASS}`}>
                    {feature.description}
                  </p>
                </div>
                <div className={feature.reversed ? "lg:order-1" : undefined}>
                  <FeatureMediaPlaceholder
                    title={feature.title}
                    videoFileName={feature.videoFileName}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="changelog" className={`${LANDING_PANEL_CLASS} p-8`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Updates
          </p>
          <h2 className="text-2xl font-bold text-foreground">
            See what’s new in RSMethods
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {latestChangelogEntries.map((entry) => (
              <article
                key={entry.slug}
                className={`${LANDING_SUBPANEL_CLASS} flex h-full flex-col p-5`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                  {formatChangelogDate(entry.date)} | {entry.version}
                </p>
                <h3 className="mt-2 text-base font-bold text-foreground">
                  {entry.title}
                </h3>
                <Link
                  to={`/changelog/${entry.slug}`}
                  className={`mt-4 inline-block text-sm ${PUBLIC_LINK_CLASS}`}
                >
                  Read update
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
