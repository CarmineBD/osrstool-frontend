import { useState } from "react";
import { useMethods } from "./hooks";
import { Link } from "react-router-dom";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { formatNumber, getUrlByType } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Method, Variant } from "@/lib/api";

export type Props = { username: string };

interface Row {
  id: string;
  methodId: string;
  methodSlug: string;
  variantSlug: string;
  variantCount: number;
  name: string;
  category: string;
  label: string;
  xpHour: { skill: string; experience: number }[];
  clickIntensity?: number;
  afkiness?: number;
  riskLevel?: string;
  levels: { skill: string; level: number }[];
  lowProfit?: number;
  highProfit?: number;
}

export function MethodsList({ username }: Props) {
  const { data, error, isLoading, isFetching } = useMethods(username);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  if (isLoading) return <p>🔄 Cargando métodos…</p>;
  if (error) return <p className="text-red-500">❌ {`${error}`}</p>;

  const rows: Row[] = (data?.methods ?? []).flatMap((method: Method) =>
    method.variants.map((variant: Variant, index: number) => {
      const xpHour = Array.isArray(variant.xpHour)
        ? variant.xpHour
        : variant.xpHour
        ? Object.entries(variant.xpHour).map(([skill, experience]) => ({
            skill,
            experience: Number(experience),
          }))
        : [];
      const levels = Array.isArray(variant.requirements?.levels)
        ? variant.requirements?.levels
        : variant.requirements?.levels
        ? Object.entries(variant.requirements.levels).map(([skill, level]) => ({
            skill,
            level: Number(level),
          }))
        : [];
      return {
        id: `${method.id}-${variant.id ?? index}`,
        methodId: method.id,
        methodSlug: method.slug,
        variantSlug: variant.slug ?? (variant.id ?? index).toString(),
        variantCount: method.variants.length,
        name: method.name,
        category: method.category,
        label: variant.label,
        xpHour,
        clickIntensity: variant.clickIntensity,
        afkiness: variant.afkiness,
        riskLevel: variant.riskLevel,
        levels,
        lowProfit: variant.lowProfit,
        highProfit: variant.highProfit,
      };
    })
  );

  const pageCount = Math.ceil(rows.length / pageSize);
  const current: Row[] = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      {isFetching && <p className="text-sm text-gray-500">Actualizando…</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Method Name</TableHead>
            {/* <TableHead>Categoría</TableHead> */}
            {/* <TableHead>Variante</TableHead> */}
            <TableHead>Gp/Hr</TableHead>
            <TableHead>XP/Hr</TableHead>
            {/* <TableHead>Intensidad de clicks</TableHead> */}
            <TableHead>AFKiness</TableHead>
            {/* <TableHead>Riesgo</TableHead> */}
            <TableHead>Requirements</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {current.map((row) => (
            <TableRow key={row.id}>
              {/* Name */}
              <TableCell className="font-medium">
                <Link
                  to={`/moneyMakingMethod/${row.methodSlug}${
                    row.variantCount > 1 ? `/${row.variantSlug}` : ""
                  }`}
                  className="text-blue-600 hover:underline"
                  state={{ methodId: row.methodId }}
                >
                  {row.name}
                </Link>
              </TableCell>

              {/* GP/hr */}
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-bold">
                    {row.highProfit !== undefined
                      ? formatNumber(row.highProfit)
                      : "N/A"}
                  </span>
                  <span>
                    {row.lowProfit !== undefined
                      ? formatNumber(row.lowProfit)
                      : "N/A"}
                  </span>
                </div>
              </TableCell>

              {/* Xp/Hr */}
              <TableCell>
                <div className="flex flex-col">
                  {(row.xpHour || []).map(
                    ({
                      skill,
                      experience,
                    }: {
                      skill: string;
                      experience: number;
                    }) => (
                      <Badge size="lg" key={skill} variant="secondary">
                        <img
                          src={getUrlByType(skill) ?? ""}
                          alt={`${skill.toLowerCase()}_icon`}
                          title={`${skill}`}
                        />
                        {formatNumber(experience)}
                      </Badge>
                    )
                  )}
                </div>
              </TableCell>

              {/* Afkiness & click intensity */}
              <TableCell>
                <div className="flex flex-col">
                  <span>{row.afkiness ? `${row.afkiness}cph` : "N/A"}</span>
                  <span>
                    {row.clickIntensity ? `${row.clickIntensity}cph` : "-"}{" "}
                  </span>
                </div>
              </TableCell>

              {/* Requirements */}
              <TableCell>
                {row.levels.map(
                  ({ skill, level }: { skill: string; level: number }) => (
                    <Badge size="lg" key={skill} variant="secondary">
                      <img
                        src={getUrlByType(skill) ?? ""}
                        alt={`${skill.toLowerCase()}_icon`}
                        title={`${skill}`}
                      />
                      {level}
                    </Badge>
                  )
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
