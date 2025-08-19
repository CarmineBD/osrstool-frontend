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
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Variante</TableHead>
            <TableHead>XP/H</TableHead>
            <TableHead>Intensidad de clicks</TableHead>
            <TableHead>AFKiness</TableHead>
            <TableHead>Riesgo</TableHead>
            <TableHead>Requisitos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {current.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                <Link
                  to={`/moneyMkingMethod/${row.methodId}`}
                  className="text-blue-600 hover:underline"
                >
                  {row.name}
                </Link>
              </TableCell>
              <TableCell>{row.category}</TableCell>
              <TableCell>{row.label}</TableCell>
              <TableCell>
                {row.xpHour.map(({ skill, experience }) => (
                  <div key={skill}>{`${skill}: ${experience}`}</div>
                ))}
              </TableCell>
              <TableCell>{row.clickIntensity}</TableCell>
              <TableCell>{row.afkiness}</TableCell>
              <TableCell>{row.riskLevel}</TableCell>
              <TableCell>
                {row.levels.map(({ skill, level }) => (
                  <div key={skill}>{`${skill}: ${level}`}</div>
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
