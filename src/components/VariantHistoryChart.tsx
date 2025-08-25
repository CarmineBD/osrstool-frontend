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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fetchVariantHistory } from "@/lib/api";
import { formatNumber, formatPercent } from "@/lib/utils";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

interface VariantHistoryChartProps {
  variantId: string;
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
    label: "Fecha",
  },
  lowProfit: { label: "Low Profit", color: "#ef4444" },
  highProfit: { label: "High Profit", color: "#22c55e" },
};

export function VariantHistoryChart({
  variantId,
  trendLastHour,
  trendLast24h,
  trendLastWeek,
  trendLastMonth,
  trendLastYear,
}: VariantHistoryChartProps) {
  const [range, setRange] =
    useState<(typeof RANGE_OPTIONS)[number]["value"]>("24h");
  const granularity =
    RANGE_OPTIONS.find((r) => r.value === range)?.granularity ?? "1h";

  const { data, isLoading, error } = useQuery({
    queryKey: ["variantHistory", variantId, range],
    queryFn: () => fetchVariantHistory(variantId, range, granularity),
    enabled: !!variantId,
  });

  const { data: allData } = useQuery({
    queryKey: ["variantHistory", variantId, "all"],
    queryFn: () => fetchVariantHistory(variantId, "all", "1d"),
    enabled: !!variantId,
  });

  const points = useMemo(
    () =>
      data?.data.map((p) => ({
        ...p,
        timestamp: new Date(p.timestamp).getTime(),
      })) ?? [],
    [data]
  );

  const yDomain = useMemo(() => {
    if (!points.length) {
      return [0, 0];
    }
    const lows = points.map((p) => p.lowProfit);
    const highs = points.map((p) => p.highProfit);
    const min = Math.min(...lows, ...highs);
    const max = Math.max(...lows, ...highs);
    const padding = (max - min) * 0.1 || 1;
    return [min - padding, max + padding];
  }, [points]);

  const snapshots = data?.variant_snapshot ?? [];
  const latestPoint = points[points.length - 1];
  const currentHigh = latestPoint?.highProfit;
  const currentLow = latestPoint?.lowProfit;

  const allPoints =
    allData?.data.map((p) => ({
      ...p,
      timestamp: new Date(p.timestamp).getTime(),
    })) ?? [];
  const minPoint =
    allPoints.length > 0
      ? allPoints.reduce((min, p) => (p.highProfit < min.highProfit ? p : min), allPoints[0])
      : undefined;
  const maxPoint =
    allPoints.length > 0
      ? allPoints.reduce((max, p) => (p.highProfit > max.highProfit ? p : max), allPoints[0])
      : undefined;

  const trends = [
    { label: "the last hour", value: trendLastHour },
    { label: "the last 24h", value: trendLast24h },
    { label: "the last week", value: trendLastWeek },
    { label: "the last month", value: trendLastMonth },
    { label: "the last year", value: trendLastYear },
  ].filter((t) => typeof t.value === "number");

  return (
    <div className="mt-4 flex flex-col gap-4 lg:flex-row">
      <Card className="flex-1">
        <CardContent className="pt-4">
          <Tabs
            value={range}
            onValueChange={(v) =>
              setRange(v as (typeof RANGE_OPTIONS)[number]["value"])
            }
            className="mb-4"
          >
            <TabsList className="grid w-full grid-cols-6">
              {RANGE_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value}>
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {isLoading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-500">Error loading history</div>
          ) : (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <LineChart data={points} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  padding={{ left: 0, right: 0 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return range === "24h"
                      ? date.toLocaleTimeString()
                      : date.toLocaleDateString();
                  }}
                />
                <YAxis domain={yDomain} hide />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const ts = payload?.[0]?.payload?.timestamp as
                          | number
                          | undefined;
                        if (!ts) return "";
                        const tz = "Europe/Madrid";
                        const d = new Date(ts);

                        const time = d.toLocaleTimeString("en-GB", {
                          timeZone: tz,
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        });
                        const day = d.toLocaleString("en-GB", {
                          day: "numeric",
                          timeZone: tz,
                        });
                        const mon = d.toLocaleString("en-US", {
                          month: "short",
                          timeZone: tz,
                        });
                        const year = d.toLocaleString("en-GB", {
                          year: "numeric",
                          timeZone: tz,
                        });

                        return `${time} - ${day} ${mon} ${year}`;
                      }}
                    />
                  }
                />

                {snapshots.map((s) => (
                  <ReferenceLine
                    key={s.timestamp}
                    x={new Date(s.timestamp).getTime()}
                    stroke="#ccc"
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
        </CardContent>
      </Card>
      <div className="flex w-full flex-col gap-4 lg:w-64">
        <Card>
          <CardHeader>
            <CardDescription>Gp/hr now</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {currentHigh !== undefined ? formatNumber(currentHigh) : "N/A"}
            </CardTitle>
            {currentLow !== undefined && (
              <div className="text-sm text-muted-foreground">
                {formatNumber(currentLow)} low profit
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {trends.map((t) => (
              <div
                key={t.label}
                className="flex items-center justify-between"
              >
                <span>
                  {`${formatPercent(t.value!, 2)} ${t.label}`}
                </span>
                {t.value! >= 0 ? (
                  <IconTrendingUp className="size-4" />
                ) : (
                  <IconTrendingDown className="size-4" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div>
                <div className="font-medium">Min</div>
                <div className="text-xl font-semibold">
                  {minPoint ? formatNumber(minPoint.highProfit) : "N/A"}
                </div>
                {minPoint && (
                  <div className="text-muted-foreground">
                    {new Date(minPoint.timestamp).toLocaleDateString("en-GB")}
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium">Max</div>
                <div className="text-xl font-semibold">
                  {maxPoint ? formatNumber(maxPoint.highProfit) : "N/A"}
                </div>
                {maxPoint && (
                  <div className="text-muted-foreground">
                    {new Date(maxPoint.timestamp).toLocaleDateString("en-GB")}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VariantHistoryChart;
