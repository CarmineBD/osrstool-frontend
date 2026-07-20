import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EDITOR_META_TEXT_CLASS,
  EDITOR_TAB_LIST_CLASS,
} from "@/components/method-editor/MethodEditorPrimitives";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { getProfitChartMetrics } from "@/components/variant-history-chart.utils";
import { fetchVariantHistory } from "@/lib/api";
import {
  QUERY_REFETCH_INTERVAL_MS,
  QUERY_STALE_TIME_MS,
} from "@/lib/queryRefresh";
import { formatNumber, formatPercent } from "@/lib/utils";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

interface VariantHistoryChartProps {
  variantId: string;
  timezone?: string;
  trendLastHour?: number;
  trendLast24h?: number;
  trendLastWeek?: number;
  trendLastMonth?: number;
  trendLastYear?: number;
}

const RANGE_OPTIONS = [
  { value: "24h", label: "24h", granularity: "10m" },
  // { value: "1w", label: "1w", granularity: "1h" },
  { value: "1m", label: "1m", granularity: "1d" },
  // { value: "6m", label: "6m", granularity: "1d" },
  { value: "1y", label: "1y", granularity: "1w" },
  { value: "all", label: "all", granularity: "1mo" },
] as const;

const chartConfig: ChartConfig = {
  title: {
    label: "Date",
  },
  lowProfit: {
    label: "Low profit",
    color: "var(--method-detail-negative)",
  },
  highProfit: {
    label: "High profit",
    color: "var(--method-detail-positive)",
  },
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

function startOfHour(timestamp: number) {
  const date = new Date(timestamp);
  date.setMinutes(0, 0, 0);
  return date.getTime();
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfMonth(timestamp: number) {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function monthOffset(timestamp: number, deltaMonths: number) {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + deltaMonths);
  return date.getTime();
}

function createDateTimeFormatter(
  options: Intl.DateTimeFormatOptions,
  timezone?: string,
  locale?: Intl.LocalesArgument,
) {
  try {
    return new Intl.DateTimeFormat(
      locale,
      timezone ? { ...options, timeZone: timezone } : options,
    );
  } catch {
    return new Intl.DateTimeFormat(locale, options);
  }
}

export function VariantHistoryChart({
  variantId,
  timezone,
  trendLast24h,
  trendLastMonth,
  trendLastYear,
}: VariantHistoryChartProps) {
  const [range, setRange] =
    useState<(typeof RANGE_OPTIONS)[number]["value"]>("24h");
  const granularity =
    RANGE_OPTIONS.find((r) => r.value === range)?.granularity ?? "1h";
  const resolvedTimeZone = useMemo(
    () => timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    [timezone],
  );

  const axisTimeFormatter = useMemo(
    () =>
      createDateTimeFormatter(
        { hour: "2-digit", minute: "2-digit", hour12: false },
        resolvedTimeZone,
      ),
    [resolvedTimeZone],
  );
  const axisDayFormatter = useMemo(
    () => createDateTimeFormatter({ day: "2-digit" }, resolvedTimeZone),
    [resolvedTimeZone],
  );
  const axisDateFormatter = useMemo(
    () =>
      createDateTimeFormatter(
        range === "1y" || range === "all"
          ? { month: "short", year: "2-digit" }
          : { day: "2-digit", month: "short" },
        resolvedTimeZone,
      ),
    [range, resolvedTimeZone],
  );
  const tooltipDateTimeFormatter = useMemo(
    () =>
      createDateTimeFormatter(
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        },
        resolvedTimeZone,
        "en-GB",
      ),
    [resolvedTimeZone],
  );
  const statsDateFormatter = useMemo(
    () =>
      createDateTimeFormatter(
        { day: "2-digit", month: "short", year: "numeric" },
        resolvedTimeZone,
        "en-GB",
      ),
    [resolvedTimeZone],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["variantHistory", variantId, range],
    queryFn: () => fetchVariantHistory(variantId, range, granularity),
    enabled: !!variantId,
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
  });

  const points = useMemo(
    () =>
      data?.data.map((p) => ({
        ...p,
        timestamp: new Date(p.timestamp).getTime(),
      })) ?? [],
    [data],
  );
  const xTicks = useMemo(() => {
    if (!points.length) {
      return [];
    }

    const minTimestamp = Math.min(...points.map((point) => point.timestamp));
    const maxTimestamp = Math.max(...points.map((point) => point.timestamp));

    if (range === "24h") {
      const ticks: number[] = [];
      let cursor = startOfHour(minTimestamp);

      while (cursor <= maxTimestamp) {
        ticks.push(cursor);
        cursor += ONE_HOUR_MS * 2;
      }
      return ticks;
    }

    if (range === "1m") {
      const ticks: number[] = [];
      let cursor = startOfDay(minTimestamp);

      while (cursor <= maxTimestamp) {
        ticks.push(cursor);
        cursor += ONE_DAY_MS;
      }
      return ticks;
    }

    if (range === "1y" || range === "all") {
      const ticks: number[] = [];
      const lastMonth = startOfMonth(maxTimestamp);
      let cursor = monthOffset(lastMonth, -11);

      while (cursor <= lastMonth) {
        ticks.push(cursor);
        cursor = monthOffset(cursor, 1);
      }
      return ticks;
    }

    return [];
  }, [points, range]);

  const chartMetrics = useMemo(() => getProfitChartMetrics(points), [points]);

  const snapshots = data?.variant_snapshot ?? [];
  const minPoint = useMemo(
    () =>
      points.length > 0
        ? points.reduce(
            (min, p) => (p.highProfit < min.highProfit ? p : min),
            points[0],
          )
        : undefined,
    [points],
  );
  const maxPoint = useMemo(
    () =>
      points.length > 0
        ? points.reduce(
            (max, p) => (p.highProfit > max.highProfit ? p : max),
            points[0],
          )
        : undefined,
    [points],
  );

  const selectedTrend = useMemo(() => {
    if (range === "24h") {
      return { label: "last 24h", value: trendLast24h };
    }
    if (range === "1m") {
      return { label: "last month", value: trendLastMonth };
    }
    return { label: "last year", value: trendLastYear };
  }, [range, trendLast24h, trendLastMonth, trendLastYear]);
  const isHistoryLoading = isLoading && !data;
  const trendValueToneClassName =
    typeof selectedTrend.value !== "number"
      ? "text-muted-foreground"
      : selectedTrend.value > 0
        ? "text-[var(--method-detail-positive)]"
        : selectedTrend.value < 0
          ? "text-[var(--method-detail-negative)]"
          : "text-muted-foreground";

  return (
    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-4">
        <Tabs
          value={range}
          onValueChange={(v) =>
            setRange(v as (typeof RANGE_OPTIONS)[number]["value"])
          }
          className="gap-4"
        >
          <TabsList
            className={`${EDITOR_TAB_LIST_CLASS} grid w-full grid-cols-2 sm:grid-cols-4`}
          >
            {RANGE_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value}>
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {isHistoryLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full rounded-xl lg:h-72" />
            <div className="flex justify-between gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Error loading history.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full lg:h-72">
            <LineChart
              data={points}
              margin={{ top: 0, right: 0, left: 0, bottom: 32 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                padding={{ left: 0, right: 0 }}
                ticks={xTicks}
                interval={0}
                minTickGap={0}
                tickMargin={8}
                angle={-35}
                textAnchor="end"
                tickFormatter={(value) => {
                  const date = new Date(Number(value));
                  return range === "24h"
                    ? axisTimeFormatter.format(date)
                    : range === "1m"
                      ? axisDayFormatter.format(date)
                      : axisDateFormatter.format(date);
                }}
              />
              <YAxis
                domain={chartMetrics.yDomain}
                ticks={chartMetrics.yTicks}
                width={56}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => formatNumber(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    payloadSortOrder={["highProfit", "lowProfit"]}
                    labelFormatter={(_, payload) => {
                      const ts = payload?.[0]?.payload?.timestamp as
                        | number
                        | undefined;
                      if (ts === undefined) return "";
                      return tooltipDateTimeFormatter.format(new Date(ts));
                    }}
                  />
                }
              />

              {chartMetrics.shouldShowZeroReferenceLine ? (
                <ReferenceLine
                  y={0}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  ifOverflow="hidden"
                />
              ) : null}

              {snapshots.map((s) => (
                <ReferenceLine
                  key={s.timestamp}
                  x={new Date(s.timestamp).getTime()}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  label={{
                    value: s.title,
                    position: "top",
                    fontSize: 10,
                  }}
                />
              ))}
              <Line
                dataKey="lowProfit"
                type="monotone"
                stroke="var(--color-lowProfit)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="highProfit"
                type="monotone"
                stroke="var(--color-highProfit)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 2xl:flex 2xl:flex-col">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{`Trend ${selectedTrend.label}`}</p>
          {isHistoryLoading ? (
            <>
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : typeof selectedTrend.value === "number" ? (
            <div
              className={`flex items-center justify-start gap-3 text-2xl font-semibold tabular-nums ${trendValueToneClassName}`}
            >
              <div>{`${formatPercent(selectedTrend.value, 0)}`}</div>
              {selectedTrend.value > 0 ? (
                <IconTrendingUp className="size-4" />
              ) : selectedTrend.value < 0 ? (
                <IconTrendingDown className="size-4" />
              ) : null}
            </div>
          ) : (
            <span className="text-2xl font-semibold text-muted-foreground">
              N/A
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-center text-sm">
          <div>
            <div className={EDITOR_META_TEXT_CLASS}>Min</div>
            {isHistoryLoading ? (
              <div className="space-y-2">
                <Skeleton className="mx-auto h-7 w-20" />
                <Skeleton className="mx-auto h-4 w-20" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {minPoint ? formatNumber(minPoint.highProfit) : "N/A"}
                </div>
                {minPoint ? (
                  <div className={EDITOR_META_TEXT_CLASS}>
                    {statsDateFormatter.format(new Date(minPoint.timestamp))}
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div>
            <div className={EDITOR_META_TEXT_CLASS}>Max</div>
            {isHistoryLoading ? (
              <div className="space-y-2">
                <Skeleton className="mx-auto h-7 w-20" />
                <Skeleton className="mx-auto h-4 w-20" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {maxPoint ? formatNumber(maxPoint.highProfit) : "N/A"}
                </div>
                {maxPoint ? (
                  <div className={EDITOR_META_TEXT_CLASS}>
                    {statsDateFormatter.format(new Date(maxPoint.timestamp))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VariantHistoryChart;
