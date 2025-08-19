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

export function MethodsList({ username }: { username: string }) {
  const { data, error, isLoading, isFetching } = useMethods(username);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  if (isLoading) return <p>🔄 Cargando métodos…</p>;
  if (error) {
    const msg =
      error instanceof Error && error.message.includes("404")
        ? "Usuario inexistente"
        : `❌ ${error}`;
    return <p className="text-red-500">{msg}</p>;
  }

  const rows =
    data?.flatMap((method) =>
      method.variants.map((variant, index) => {
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
          ? Object.entries(variant.requirements.levels).map(
              ([skill, level]) => ({ skill, level: Number(level) })
            )
          : [];
        return {
          id: `${method.id}-${variant.id ?? index}`,
          methodId: method.id,
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
    ) || [];

  const pageCount = Math.ceil(rows.length / pageSize);
  const current = rows.slice((page - 1) * pageSize, page * pageSize);

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
                  to={`/moneyMakingMethod/${row.methodId}`}
                  className="text-blue-600 hover:underline"
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
                  {(row.xpHour || []).map(({ skill, experience }) => (
                    <Badge size="lg" key={skill} variant="secondary">
                      <img
                        src={getUrlByType(skill) ?? ""}
                        alt={`${skill.toLowerCase()}_icon`}
                        title={`${skill}`}
                      />
                      {formatNumber(experience)}
                    </Badge>
                  ))}
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
                {row.levels.map(({ skill, level }) => (
                  <Badge size="lg" key={skill} variant="secondary">
                    <img
                      src={getUrlByType(skill) ?? ""}
                      alt={`${skill.toLowerCase()}_icon`}
                      title={`${skill}`}
                    />
                    {level}
                  </Badge>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
