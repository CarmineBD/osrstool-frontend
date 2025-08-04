import React from "react";
import { useMethods } from "./hooks";

export function MethodsList({ username }: { username: string }) {
  const { data, error, isLoading, isFetching } = useMethods(username);

  if (isLoading) return <p>🔄 Cargando métodos…</p>;
  if (error) {
    const msg =
      error instanceof Error && error.message.includes("404")
        ? "Usuario inexistente"
        : `❌ ${error}`;
    return <p className="text-red-500">{msg}</p>;
  }

  return (
    <div className="space-y-4">
      {isFetching && <p className="text-sm text-gray-500">Actualizando…</p>}
      {data &&
        data.map((method) => (
          <div
            key={method.id}
            className="flex justify-between items-center p-4 bg-white rounded shadow"
          >
            <span className="font-medium">{method.name}</span>
            <span className="text-lg font-bold">
              {method.variants.map((variant) => (
                <span key={variant.id} className="mr-2">
                  {variant.label} ({variant.highProfit} gp/h)
                </span>
              ))}{" "}
              gp/h
            </span>
          </div>
        ))}
    </div>
  );
}
