import React from "react";
import { Method } from "../api";

interface MethodsTableProps {
  methods: Method[];
}

export function MethodsTable({ methods }: MethodsTableProps) {
  return (
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left font-medium text-gray-700">Method</th>
          <th className="px-4 py-2 text-left font-medium text-gray-700">Variant</th>
          <th className="px-4 py-2 text-left font-medium text-gray-700">Category</th>
          <th className="px-4 py-2 text-left font-medium text-gray-700">XP/h</th>
          <th className="px-4 py-2 text-left font-medium text-gray-700">Afkiness</th>
          <th className="px-4 py-2 text-left font-medium text-gray-700">High Profit</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {methods.flatMap((method) =>
          method.variants.map((variant) => (
            <tr key={variant.id}>
              <td className="px-4 py-2">{method.name}</td>
              <td className="px-4 py-2">{variant.label}</td>
              <td className="px-4 py-2">{method.category}</td>
              <td className="px-4 py-2">
                {Object.values(variant.xpHour)[0]?.toLocaleString()}
              </td>
              <td className="px-4 py-2">{variant.afkiness ?? "-"}</td>
              <td className="px-4 py-2">
                {variant.highProfit.toLocaleString()}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
