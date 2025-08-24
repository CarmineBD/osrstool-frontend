import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, CartesianGrid, ReferenceLine, XAxis } from "recharts";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fetchVariantHistory } from "@/lib/api";

interface VariantHistoryChartProps {
  variantId: string;
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

export function VariantHistoryChart({ variantId }: VariantHistoryChartProps) {
  const [range, setRange] =
    useState<(typeof RANGE_OPTIONS)[number]["value"]>("24h");
  const granularity =
    RANGE_OPTIONS.find((r) => r.value === range)?.granularity ?? "1h";

  const { data, isLoading, error } = useQuery({
    queryKey: ["variantHistory", variantId, range],
    queryFn: () => fetchVariantHistory(variantId, range, granularity),
    enabled: !!variantId,
  });

  const points =
    data?.data.map((p) => ({
      ...p,
      timestamp: new Date(p.timestamp).getTime(),
    })) ?? [];

  const snapshots = data?.variant_snapshot ?? [];

  return (
    <Card className="mt-4">
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
            <LineChart data={points} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["auto", "auto"]}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return range === "24h"
                    ? date.toLocaleTimeString()
                    : date.toLocaleDateString();
                }}
              />
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
  );
}

export default VariantHistoryChart;
