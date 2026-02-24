import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useUsername } from "@/contexts/UsernameContext";
import { fetchMethodsSkillsSummary, type SkillSummaryMethod } from "@/lib/api";
import { formatSkillName, OSRS_SKILLS } from "@/lib/skills";
import { formatNumber, getUrlByType } from "@/lib/utils";
import { useSeo } from "@/hooks/useSeo";
import {
  QUERY_REFETCH_INTERVAL_MS,
  QUERY_STALE_TIME_MS,
} from "@/lib/queryRefresh";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchMe } from "@/lib/me";

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
  methodId: string;
  methodLink: string | null;
  methodName: string;
  gpHr: string;
  xpHr: string;
  afkiness: string;
};

type SummaryMetric = {
  id: "profit" | "xp" | "afk";
  label: "GP/hr" | "XP/hr" | "AFKiness";
  value: string;
  details: MethodMetricDetails | null;
};

function getMethodMetricDetails(
  method: SkillSummaryMethod | null | undefined,
  skill: string,
): MethodMetricDetails | null {
  if (!method) return null;

  const variant = getSummaryVariant(method);
  const xpValue = getSkillXp(variant, skill);
  const gpHr =
    variant?.highProfit !== undefined
      ? formatNumber(variant.highProfit)
      : "N/A";
  const xpHr = xpValue !== undefined ? formatNumber(xpValue) : "N/A";
  const afkiness = formatAfkiness(variant?.afkiness);
  const methodName = method.name;

  return {
    methodId: method.id,
    methodLink: toMethodLink(method),
    methodName,
    gpHr,
    xpHr,
    afkiness,
  };
}

function toMethodLink(method?: SkillSummaryMethod | null): string | null {
  if (!method?.slug) return null;
  const variant = getSummaryVariant(method);
  const variantCount = method.variantCount ?? method.variants.length;
  const variantPath =
    variant?.slug && variantCount > 1 ? `/${variant.slug}` : "";
  return `/moneyMakingMethod/${method.slug}${variantPath}`;
}

function SkillSummaryTags({
  isLoading,
  summaryMetrics,
}: {
  isLoading: boolean;
  summaryMetrics: SummaryMetric[];
}) {
  const navigate = useNavigate();
  const [hoveredMethodId, setHoveredMethodId] = useState<string | null>(null);
  const hasAnyMetricData = summaryMetrics.some((metric) => metric.details);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading summary...</p>;
  }

  if (!hasAnyMetricData) {
    return <p className="text-muted-foreground">No data</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {summaryMetrics.map((metric) => {
        const isDimmed =
          hoveredMethodId !== null &&
          (!metric.details || metric.details.methodId !== hoveredMethodId);

        if (!metric.details) {
          return (
            <Badge
              key={metric.id}
              variant="outline"
              size="sm"
              className={`text-muted-foreground transition-opacity ${
                isDimmed ? "opacity-45" : "opacity-100"
              }`}
            >
              {metric.label}: {metric.value}
            </Badge>
          );
        }

        const details = metric.details;

        return (
          <Tooltip key={metric.id}>
            <TooltipTrigger asChild>
              <Badge
                asChild
                variant="secondary"
                size="sm"
                className={`cursor-pointer border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-opacity ${
                  isDimmed ? "opacity-45 grayscale" : "opacity-100"
                }`}
              >
                <button
                  type="button"
                  aria-label={`${metric.label}: ${metric.value}. Metodo: ${details.methodName}`}
                  onClick={() => {
                    if (!details.methodLink) return;
                    navigate(details.methodLink);
                  }}
                  onMouseEnter={() => setHoveredMethodId(details.methodId)}
                  onMouseLeave={() => setHoveredMethodId(null)}
                  onFocus={() => setHoveredMethodId(details.methodId)}
                  onBlur={() => setHoveredMethodId(null)}
                  className="inline-flex items-center leading-none"
                >
                  {metric.label}: {metric.value}
                </button>
              </Badge>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              <div className="space-y-0.5">
                <p className="font-semibold">{details.methodName}</p>
                <p>GP/hr: {details.gpHr}</p>
                <p>XP/hr: {details.xpHr}</p>
                <p>AFKiness: {details.afkiness}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function SkillingPage() {
  useSeo({
    title: "Skilling | OSRSTool",
    description:
      "Explora todas las skills de OSRS y revisa por skill el mejor metodo por profit/hr, xp/hr y afk.",
    path: "/skilling",
    keywords: "osrs skilling methods, osrs skill guides, osrs best xp methods",
  });

  const { session } = useAuth();
  const { username } = useUsername();
  const [enabledFilter, setEnabledFilter] = useState<boolean>(false);
  const trimmedUsername = username.trim();
  const effectiveUsername =
    session && trimmedUsername ? trimmedUsername : undefined;
  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: !!session,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });
  const isSuperAdmin = meData?.data?.role === "super_admin";
  const effectiveEnabled = isSuperAdmin ? enabledFilter : false;

  const { data, error, isLoading } = useQuery({
    queryKey: ["methodsSkillsSummary", effectiveUsername, effectiveEnabled],
    queryFn: () =>
      fetchMethodsSkillsSummary(effectiveUsername, effectiveEnabled),
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
    retry: false,
  });

  const computedAt = useMemo(() => {
    if (!data?.meta?.computedAt) return null;
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(data.meta.computedAt * 1000));
  }, [data?.meta?.computedAt]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto space-y-6 p-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Skilling</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona una skill para ver su listado filtrado de metodos y
            revisar los mejores metodos por gp/hr, xp/hr y afkiness.
          </p>
          {isSuperAdmin ? (
            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={enabledFilter}
                onCheckedChange={(checked) => setEnabledFilter(checked)}
              />
              <span className="text-sm">enabled</span>
            </div>
          ) : null}
          {computedAt ? (
            <p className="text-xs text-muted-foreground">
              Summary actualizado: {computedAt}
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Error: {String(error)}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OSRS_SKILLS.map((skill) => {
            const skillName = formatSkillName(skill);
            const skillSummary = data?.data?.[skill];
            const iconUrl = getUrlByType(skill);
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
                label: "GP/hr",
                value: bestProfitDetails?.gpHr ?? "N/A",
                details: bestProfitDetails,
              },
              {
                id: "xp",
                label: "XP/hr",
                value: bestXpDetails?.xpHr ?? "N/A",
                details: bestXpDetails,
              },
              {
                id: "afk",
                label: "AFKiness",
                value: bestAfkDetails?.afkiness ?? "N/A",
                details: bestAfkDetails,
              },
            ];

            return (
              <article
                key={skill}
                className="rounded-lg border bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-3">
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={`${skill}_icon`}
                      className="block shrink-0 [image-rendering:pixelated]"
                    />
                  ) : null}
                  <Link
                    to={`/skilling/${skill}`}
                    className="text-lg font-semibold text-blue-600 hover:underline"
                  >
                    {skillName}
                  </Link>
                </div>

                <div>
                  <SkillSummaryTags
                    isLoading={isLoading}
                    summaryMetrics={summaryMetrics}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
