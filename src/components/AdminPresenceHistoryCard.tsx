import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from "recharts";
import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_CARD_CONTENT_CLASS,
  EDITOR_CARD_HEADER_CLASS,
  EDITOR_META_TEXT_CLASS,
  EDITOR_PRIMARY_CARD_CLASS,
  EDITOR_TAB_LIST_CLASS,
  SectionHeader,
} from "@/components/method-editor/MethodEditorPrimitives";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AdminPresenceHistoryData,
  AdminPresenceHistoryRange,
} from "@/lib/admin";

const RANGE_OPTIONS: Array<{ label: string; value: AdminPresenceHistoryRange }> = [
  { label: "72h", value: "72h" },
  { label: "30d", value: "30d" },
  { label: "1y", value: "1y" },
];

const chartConfig: ChartConfig = {
  peakOnline: {
    label: "Peak users",
    color: "var(--color-chart-2)",
  },
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatYAxisValue(value: number) {
  return numberFormatter.format(value);
}

function buildAxisFormatter(
  range: AdminPresenceHistoryRange,
  timeZone: string,
): Intl.DateTimeFormat {
  if (range === "72h") {
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      timeZone,
    });
  }

  if (range === "30d") {
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      day: "2-digit",
      timeZone,
    });
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone,
  });
}

function buildTooltipFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

type AdminPresenceHistoryCardProps = {
  data?: AdminPresenceHistoryData;
  error?: Error | null;
  isLoading: boolean;
  range: AdminPresenceHistoryRange;
  onRangeChange: (value: AdminPresenceHistoryRange) => void;
};

export function AdminPresenceHistoryCard({
  data,
  error,
  isLoading,
  range,
  onRangeChange,
}: AdminPresenceHistoryCardProps) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const axisFormatter = useMemo(
    () => buildAxisFormatter(range, timeZone),
    [range, timeZone],
  );
  const tooltipFormatter = useMemo(
    () => buildTooltipFormatter(timeZone),
    [timeZone],
  );
  const points = useMemo(
    () =>
      (data?.points ?? []).map((point) => ({
        ...point,
        timestamp: new Date(point.bucketStart).getTime(),
      })),
    [data?.points],
  );
  const provisionalPoint = points[points.length - 1]?.provisional
    ? points[points.length - 1]
    : undefined;

  return (
    <Card className={EDITOR_PRIMARY_CARD_CLASS}>
      <CardHeader className={EDITOR_CARD_HEADER_CLASS}>
        <SectionHeader
          title="Concurrent users"
          description="Historical peak concurrent users aggregated in UTC and rendered in your local time."
        />
      </CardHeader>
      <CardContent className={EDITOR_CARD_CONTENT_CLASS}>
        <Tabs
          value={range}
          onValueChange={(value) => onRangeChange(value as AdminPresenceHistoryRange)}
          className="gap-4"
        >
          <TabsList className={`${EDITOR_TAB_LIST_CLASS} grid w-full grid-cols-3`}>
            {RANGE_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Error loading concurrent users history.</p>
        ) : (
          <div className="space-y-3">
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                  minTickGap={24}
                  tickFormatter={(value) => axisFormatter.format(new Date(Number(value)))}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={56}
                  tickFormatter={(value) => formatYAxisValue(Number(value))}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const timestamp = payload?.[0]?.payload?.timestamp as
                          | number
                          | undefined;
                        if (timestamp === undefined) return "";
                        return tooltipFormatter.format(new Date(timestamp));
                      }}
                    />
                  }
                />
                <Line
                  dataKey="peakOnline"
                  name="peakOnline"
                  type="monotone"
                  stroke="var(--color-peakOnline)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                {provisionalPoint ? (
                  <ReferenceDot
                    x={provisionalPoint.timestamp}
                    y={provisionalPoint.peakOnline}
                    r={5}
                    fill="var(--color-chart-4)"
                    stroke="var(--background)"
                    label={{
                      value: "Provisional",
                      position: "top",
                      fontSize: 10,
                    }}
                  />
                ) : null}
              </LineChart>
            </ChartContainer>
            <p className={EDITOR_BODY_TEXT_CLASS}>
              {range === "72h" && provisionalPoint
                ? "Current hour (provisional) is included as the last point."
                : "Only finalized buckets are shown for this range."}
            </p>
            <p className={EDITOR_META_TEXT_CLASS}>
              Storage remains in UTC. Labels are converted to {timeZone}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
