// src/features/methods/MethodsList.tsx
import React from "react";
import { useMethods } from "./hooks";

export function MethodsList() {
  const { data, error, isLoading, isFetching } = useMethods();

  if (isLoading) return <p>🔄 Cargando métodos…</p>;
  if (error) return <p className="text-red-500">❌ {`${error}`}</p>;

  return (
    <div className="space-y-4">
      {isFetching && <p className="text-sm text-gray-500">Actualizando…</p>}
      {data!.map((m) => (
        <div
          key={m.id}
          className="flex justify-between items-center p-4 bg-white rounded shadow"
        >
          <span className="font-medium">{m.name}</span>
          <span className="text-lg font-bold">
            {m.gpPerHour.toLocaleString()} gp/h
          </span>
        </div>
      ))}
    </div>
  );
}
