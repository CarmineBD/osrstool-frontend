import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

async function fetchMethodDetail(id: string) {
  const url = `${import.meta.env.VITE_API_URL}/methods/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} – Error fetching method`);
  const json = await res.json();
  return json.data;
}

export function MethodDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading } = useQuery({
    queryKey: ["methodDetail", id],
    queryFn: () => fetchMethodDetail(id!),
    enabled: !!id,
  });

  if (isLoading) return <p>Cargando método…</p>;
  if (error) return <p className="text-red-500">❌ {`${error}`}</p>;
  if (!data) return <p>No se encontró el método.</p>;

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-2">{data.name}</h2>
      <p className="mb-2">{data.description}</p>
      <div className="mb-4">
        <span className="font-semibold">Categoría:</span> {data.category}
      </div>
      <h3 className="font-semibold mb-2">Variantes:</h3>
      {data.variants.map((variant: any) => (
        <div key={variant.id} className="mb-4 p-3 border rounded">
          <div className="font-bold">{variant.label}</div>
          <div>
            Profit: {variant.lowProfit} - {variant.highProfit} gp/h
          </div>
          <div>AFKiness: {variant.afkiness}</div>
          <div>Click Intensity: {variant.clickIntensity}</div>
          <div>Risk Level: {variant.riskLevel}</div>
          <div>
            <span className="font-semibold">Requisitos:</span>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
              {JSON.stringify(variant.requirements, null, 2)}
            </pre>
          </div>
          <div>
            <span className="font-semibold">XP/h:</span>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
              {JSON.stringify(variant.xpHour, null, 2)}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}
