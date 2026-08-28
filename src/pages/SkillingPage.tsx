import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AnimatedProfitValue } from "@/components/AnimatedProfitValue";
import { MethodIdentity } from "@/components/MethodIdentity";
import { useAuth } from "@/auth/AuthProvider";
import { useUsername } from "@/contexts/UsernameContext";
import {
  fetchIconRecords,
  fetchMethodsSkillsSummary,
  getIconReferenceKey,
  normalizeIconSource,
  type IconRecord,
  type IconReference,
  type SkillSummaryMethod,
} from "@/lib/api";
import { formatSkillName, type OsrsSkill } from "@/lib/skills";
import { formatNumber, getUrlByType } from "@/lib/utils";
import { useSeo } from "@/hooks/useSeo";
import {
  QUERY_REFETCH_INTERVAL_MS,
  QUERY_STALE_TIME_MS,
} from "@/lib/queryRefresh";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchMe, getMeQueryKey } from "@/lib/me";
import { PUBLIC_PANEL_CLASS } from "@/components/public-page/publicPageStyles";

const SKILL_CATEGORIES: Array<{
  title: string;
  description: string;
  skills: readonly OsrsSkill[];
}> = [
  {
    title: "Combat skills",
    description: "Skills that directly improve your power in combat.",
    skills: [
      "attack",
      "defence",
      "hitpoints",
      "magic",
      "prayer",
      "ranged",
      "strength",
    ],
  },
  {
    title: "Gathering skills",
    description: "Skills for collecting resources used by other activities.",
    skills: ["farming", "fishing", "hunter", "mining", "woodcutting"],
  },
  {
    title: "Production skills",
    description: "Skills for turning raw resources into useful items.",
    skills: [
      "cooking",
      "crafting",
      "fletching",
      "herblore",
      "runecraft",
      "smithing",
    ],
  },
  {
    title: "Utility skills",
    description: "Skills that expand the ways you can explore and progress.",
    skills: [
      "agility",
      "construction",
      "firemaking",
      "sailing",
      "slayer",
      "thieving",
    ],
  },
];

function getSummaryVariant(method?: SkillSummaryMethod | null) {
  return method?.variants?.[0] ?? null;
}

function getSkillXp(
  variant: ReturnType<typeof getSummaryVariant>,
  skill: string,
): number | undefined {
  if (!variant?.xpHour) return undefined;
  return variant.xpHour.find((entry) => entry.skill.toLowerCase() === skill)
    ?.experience;
}

function formatAfkiness(afkiness?: number): string {
  return afkiness !== undefined ? `${afkiness}%` : "N/A";
}

type MethodMetricDetails = {
  methodLink: string | null;
  methodName: string;
  variantLabel: string;
  iconReference: IconReference | null;
  gpHr: string;
  gpHrValue?: number;
  xpHr: string;
  afkiness: string;
};

type SummaryMetric = {
  id: "profit" | "xp" | "afk";
  label: "Best for Profit" | "Best for XP" | "Most AFK";
  value: string;
  numericValue?: number;
  details: MethodMetricDetails | null;
};

function toMethodLink(method?: SkillSummaryMethod | null): string | null {
  if (!method?.slug) return null;
  const variant = getSummaryVariant(method);
  const variantCount = method.variantCount ?? method.variants.length;
  const variantPath =
    variant?.slug && variantCount > 1 ? `/${variant.slug}` : "";
  return `/moneyMakingMethod/${method.slug}${variantPath}`;
}

function getMethodMetricDetails(
  method: SkillSummaryMethod | null | undefined,
  skill: string,
): MethodMetricDetails | null {
  if (!method) return null;

  const variant = getSummaryVariant(method);
  const xpValue = getSkillXp(variant, skill);
  const iconReference =
    variant?.icon_id && Number.isSafeInteger(variant.icon_id)
      ? { id: variant.icon_id, source: normalizeIconSource(variant.iconSource) }
      : null;

  return {
    methodLink: toMethodLink(method),
    methodName: method.name,
    variantLabel: variant?.label?.trim() || "Default variant",
    iconReference,
    gpHr:
      variant?.highProfit !== undefined
        ? formatNumber(variant.highProfit)
        : "N/A",
    gpHrValue: variant?.highProfit,
    xpHr: xpValue !== undefined ? formatNumber(xpValue) : "N/A",
    afkiness: formatAfkiness(variant?.afkiness),
  };
}

function MetricValue({ metric }: { metric: SummaryMetric }) {
  if (metric.id === "profit") {
    return <AnimatedProfitValue value={metric.numericValue} />;
  }

  return <>{metric.value}</>;
}

function getMetricUnit(metric: SummaryMetric): string {
  switch (metric.id) {
    case "profit":
      return "GP/hr";
    case "xp":
      return "XP/hr";
    case "afk":
      return "AFK";
  }
}

function SkillSummaryMetrics({
  isLoading,
  summaryMetrics,
  variantIcons,
  onTooltipPointerEnter,
  onTooltipPointerLeave,
}: {
  isLoading: boolean;
  summaryMetrics: SummaryMetric[];
  variantIcons: Record<string, IconRecord>;
  onTooltipPointerEnter?: (metricId: SummaryMetric["id"]) => void;
  onTooltipPointerLeave?: (metricId: SummaryMetric["id"]) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid w-full grid-cols-3 gap-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-3 gap-4">
      {summaryMetrics.map((metric) => {
        const metricUnit = getMetricUnit(metric);
        const iconUrl = metric.details?.iconReference
          ? variantIcons[getIconReferenceKey(metric.details.iconReference)]?.iconUrl
          : undefined;
        const metricContent = (
          <>
            <p className="min-h-8 text-xs font-medium leading-4 text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 text-sm font-semibold leading-5 text-foreground">
              <span className="inline-flex items-baseline gap-1">
                <MetricValue metric={metric} />
                <span className="text-xs font-medium text-muted-foreground">
                  {metricUnit}
                </span>
              </span>
            </p>
          </>
        );

        if (!metric.details?.methodLink) {
          return (
            <div key={metric.id} className="min-w-0">
              {metricContent}
            </div>
          );
        }

        return (
          <Tooltip key={metric.id}>
            <TooltipTrigger asChild>
              <Link
                to={metric.details.methodLink}
                aria-label={`${metric.label}: ${metric.value} ${metricUnit}. Method: ${metric.details.methodName}`}
                className="min-w-0 rounded-sm outline-hidden transition-colors hover:text-link focus-visible:ring-2 focus-visible:ring-brand/35"
                onPointerEnter={() => onTooltipPointerEnter?.(metric.id)}
                onPointerLeave={() => onTooltipPointerLeave?.(metric.id)}
              >
                {metricContent}
              </Link>
            </TooltipTrigger>
            <TooltipContent
              sideOffset={6}
              onPointerEnter={() => onTooltipPointerEnter?.(metric.id)}
              onPointerLeave={() => onTooltipPointerLeave?.(metric.id)}
            >
              <MethodIdentity
                iconUrl={iconUrl}
                iconAlt={`${metric.details.methodName} icon`}
                methodName={
                  <p className="block min-w-0 truncate text-link">
                    {metric.details.methodName}
                  </p>
                }
                variantLabel={metric.details.variantLabel}
              />
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function SkillingPage() {
  useSeo({
    title: "Skilling | RSMethods",
    description:
      "Browse every OSRS skill and review the best method for each one by GP/hr, XP/hr, and AFK.",
    path: "/skilling",
    keywords: "osrs skilling methods, osrs skill guides, osrs best xp methods",
  });

  const { session } = useAuth();
  const { player } = useUsername();
  const [enabledFilter, setEnabledFilter] = useState(true);
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
  const tooltipCloseTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (tooltipCloseTimeoutRef.current !== null) {
        window.clearTimeout(tooltipCloseTimeoutRef.current);
      }
    },
    [],
  );

  const keepTooltipCardOpen = (tooltipId: string) => {
    if (tooltipCloseTimeoutRef.current !== null) {
      window.clearTimeout(tooltipCloseTimeoutRef.current);
      tooltipCloseTimeoutRef.current = null;
    }
    setOpenTooltipId(tooltipId);
  };

  const closeTooltipCardAfterPointerTransition = (tooltipId: string) => {
    if (tooltipCloseTimeoutRef.current !== null) {
      window.clearTimeout(tooltipCloseTimeoutRef.current);
    }
    tooltipCloseTimeoutRef.current = window.setTimeout(() => {
      setOpenTooltipId((currentTooltipId) =>
        currentTooltipId === tooltipId ? null : currentTooltipId,
      );
      tooltipCloseTimeoutRef.current = null;
    }, 120);
  };
  const effectivePlayer = session ? (player ?? undefined) : undefined;
  const { data: meData } = useQuery({
    queryKey: getMeQueryKey(session?.user?.id),
    queryFn: fetchMe,
    enabled: !!session,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });
  const isSuperAdmin = meData?.data?.role === "super_admin";
  const effectiveEnabled = isSuperAdmin ? enabledFilter : undefined;

  const { data, error, isLoading } = useQuery({
    queryKey: ["methodsSkillsSummary", effectivePlayer, effectiveEnabled],
    queryFn: () => fetchMethodsSkillsSummary(effectivePlayer, effectiveEnabled),
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
    retry: false,
  });

  const skillSummaryIconReferences = useMemo(() => {
    const references = new Map<string, IconReference>();

    Object.values(data?.data ?? {}).forEach((summary) => {
      [summary.bestProfit, summary.bestXp, summary.bestAfk].forEach((method) => {
        const variant = getSummaryVariant(method);
        if (!variant?.icon_id || !Number.isSafeInteger(variant.icon_id)) return;

        const reference = {
          id: variant.icon_id,
          source: normalizeIconSource(variant.iconSource),
        };
        references.set(getIconReferenceKey(reference), reference);
      });
    });

    return Array.from(references.values());
  }, [data?.data]);

  const { data: skillSummaryIcons = {} } = useQuery<Record<string, IconRecord>>({
    queryKey: [
      "skillSummaryIconRecords",
      skillSummaryIconReferences.map(getIconReferenceKey).sort(),
    ],
    queryFn: () => fetchIconRecords(skillSummaryIconReferences),
    enabled: skillSummaryIconReferences.length > 0,
    staleTime: QUERY_STALE_TIME_MS,
  });

  const computedAt = useMemo(() => {
    if (!data?.meta?.computedAt) return null;
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(data.meta.computedAt * 1000));
  }, [data?.meta?.computedAt]);

  return (
    <div className="min-h-screen bg-surface-page">
      <div className="container mx-auto space-y-8 p-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Skilling</h1>
          <p className="text-sm text-muted-foreground">
            Browse every skill and compare its best methods by profit,
            experience, and intensity.
          </p>
          {isSuperAdmin ? (
            <div className="flex items-center gap-2 pt-2">
              <Switch
                aria-label="Enabled methods filter"
                checked={enabledFilter}
                onCheckedChange={setEnabledFilter}
              />
              <span className="text-sm">Enabled only</span>
            </div>
          ) : null}
          {computedAt ? (
            <p className="text-xs text-muted-foreground">
              Summary updated: {computedAt}
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Error: {String(error)}
          </div>
        ) : null}

        <div className="space-y-8">
          {SKILL_CATEGORIES.map((category) => (
            <section
              key={category.title}
              aria-labelledby={`${category.title}-heading`}
            >
              <div className="mb-4 space-y-1">
                <h2
                  id={`${category.title}-heading`}
                  className="text-lg font-semibold leading-6 text-foreground"
                >
                  {category.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {category.skills.map((skill) => {
                  const skillName = formatSkillName(skill);
                  const skillSummary = data?.data?.[skill];
                  const iconUrl = getUrlByType(skill);
                  const variantCount = skillSummary?.officialVariantCount ?? 0;
                  const hasNoVariants = !isLoading && variantCount === 0;
                  const skillTooltipPrefix = `${skill}:`;
                  const hasOpenTooltip =
                    openTooltipId?.startsWith(skillTooltipPrefix) ?? false;
                  const bestProfitDetails = getMethodMetricDetails(
                    skillSummary?.bestProfit,
                    skill,
                  );
                  const bestXpDetails = getMethodMetricDetails(
                    skillSummary?.bestXp,
                    skill,
                  );
                  const bestAfkDetails = getMethodMetricDetails(
                    skillSummary?.bestAfk,
                    skill,
                  );
                  const summaryMetrics: SummaryMetric[] = [
                    {
                      id: "profit",
                      label: "Best for Profit",
                      value: bestProfitDetails?.gpHr ?? "N/A",
                      numericValue: bestProfitDetails?.gpHrValue,
                      details: bestProfitDetails,
                    },
                    {
                      id: "xp",
                      label: "Best for XP",
                      value: bestXpDetails?.xpHr ?? "N/A",
                      details: bestXpDetails,
                    },
                    {
                      id: "afk",
                      label: "Most AFK",
                      value: bestAfkDetails?.afkiness ?? "N/A",
                      details: bestAfkDetails,
                    },
                  ];

                  return (
                    <article
                      key={skill}
                      className={`${PUBLIC_PANEL_CLASS} group relative h-48 overflow-hidden p-5 lg:h-40 ${
                        hasNoVariants
                          ? "border-dashed bg-surface-panel-subtle opacity-65"
                          : `transition-[border-color,box-shadow] duration-300 ease-out hover:border-brand/35 hover:shadow-md focus-within:border-brand/35 focus-within:shadow-md ${
                              hasOpenTooltip ? "border-brand/35 shadow-md" : ""
                            }`
                      }`}
                    >
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-1 text-right text-xs font-medium tabular-nums">
                        <span className="text-muted-foreground">
                          {`${variantCount} ${variantCount === 1 ? "variant" : "variants"}`}
                        </span>
                        {variantCount > 0 ? (
                          <Link
                            to={`/skilling/${skill}`}
                            className="text-link no-underline outline-hidden transition-colors hover:text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-brand/35"
                          >
                            See all variants
                          </Link>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 pr-28">
                        {iconUrl ? (
                          <img
                            src={iconUrl}
                            alt={`${skill}_icon`}
                            className="block shrink-0 [image-rendering:pixelated]"
                          />
                        ) : null}
                        {hasNoVariants ? (
                          <span className="text-lg font-semibold text-muted-foreground">
                            {skillName}
                          </span>
                        ) : (
                          <Link
                            to={`/skilling/${skill}`}
                            className="text-lg font-semibold text-foreground no-underline outline-hidden transition-colors hover:text-link focus-visible:text-link focus-visible:ring-2 focus-visible:ring-brand/35"
                          >
                            {skillName}
                          </Link>
                        )}
                      </div>

                      {hasNoVariants ? (
                        <p className="mt-4 text-sm leading-5 text-muted-foreground">
                          No variants added yet.
                        </p>
                      ) : (
                        <div
                          className={`absolute right-5 bottom-5 left-5 border-t border-border pt-4 transition-opacity duration-300 ease-out lg:pointer-events-none lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:opacity-100 lg:group-focus-within:pointer-events-auto lg:group-focus-within:opacity-100 motion-reduce:transition-none ${
                            hasOpenTooltip
                              ? "lg:pointer-events-auto lg:opacity-100"
                              : ""
                          }`}
                        >
                          <SkillSummaryMetrics
                            isLoading={isLoading}
                            summaryMetrics={summaryMetrics}
                            variantIcons={skillSummaryIcons}
                            onTooltipPointerEnter={(metricId) => {
                              const tooltipId = `${skillTooltipPrefix}${metricId}`;
                              keepTooltipCardOpen(tooltipId);
                            }}
                            onTooltipPointerLeave={(metricId) => {
                              const tooltipId = `${skillTooltipPrefix}${metricId}`;
                              closeTooltipCardAfterPointerTransition(tooltipId);
                            }}
                          />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
