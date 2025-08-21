// Mychart.tsx
import * as React from "react";
import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

// Datos de ejemplo (ajusta a los tuyos)
const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

// Mapa de colores/labels para ChartContainer (shadcn)
const chartConfig = {
  desktop: { label: "Desktop", color: "#3b82f6" },
  mobile: { label: "Mobile", color: "#10b981" },
};

// Puedes pasar aquí tus “eventos” a marcar en el eje X
const eventMarkers = [
  { x: "March", label: "Evento" },
  // { x: "May", label: "Bugfix" },
];

// 1) Componente reusable
type EventMarkerProps = {
  x: string | number; // valor del eje X (categoría o timestamp)
  tooltip?: string; // texto al hacer hover
  label?: string; // opcional, por si quieres mostrar texto arriba
};

function EventMarker({ x, tooltip, label }: EventMarkerProps) {
  return (
    <ReferenceLine
      isFront
      x={x}
      stroke="hsl(var(--muted-foreground, 215 16% 47%))"
      strokeDasharray="4 4"
      label={(props: any) => {
        const vb = props?.viewBox || {};
        const cx = vb.x ?? 0;
        const bottom = (vb.y ?? 0) + (vb.height ?? 0);

        return (
          <g>
            {/* Etiqueta opcional arriba */}
            {label ? (
              <text
                x={cx}
                y={vb.y - 6}
                textAnchor="middle"
                fontSize={10}
                fill="hsl(var(--muted-foreground, 215 16% 47%))"
              >
                {label}
              </text>
            ) : null}

            {/* Icono "info" cerca del borde inferior del área del chart */}
            <g
              transform={`translate(${cx}, ${bottom - 6})`}
              style={{ cursor: "help" }}
            >
              <circle
                r="7"
                fill="hsl(var(--muted-foreground, 215 16% 47%))"
                opacity="0.9"
              />
              <text
                textAnchor="middle"
                dy="0.35em"
                fontSize="10"
                fill="white"
                fontWeight={600}
              >
                i
              </text>
              {/* Tooltip nativo */}
              <title>{tooltip ?? `snapshot ${String(x)}`}</title>
            </g>
          </g>
        );
      }}
    />
  );
}

export default function MyChart() {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle>Visitas</CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />

            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: string) => v.slice(0, 3)}
            />

            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />

            {/* Líneas verticales de evento */}
            {eventMarkers.map((m) => (
              <ReferenceLine
                key={m.x}
                x={m.x} // Debe coincidir con el valor del eje X (p.ej. "March")
                stroke="#ccc"
                strokeDasharray="4 4"
                label={{
                  value: m.label,
                  position: "top",
                  fontSize: 10,
                }}
              />
            ))}

            <Line
              dataKey="desktop"
              type="monotone"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="mobile"
              type="monotone"
              stroke="var(--color-mobile)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground leading-none">
              Showing total visitors for the last 6 months
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

/**
 * Si tu eje X fuese fecha numérica (timestamp):
 *
 * <XAxis dataKey="date" type="number" scale="time" domain={["dataMin","dataMax"]} />
 * <ReferenceLine x={new Date("2024-03-15").getTime()} stroke="#ccc" />
 */
