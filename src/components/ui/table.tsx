import React from "react";

export function Table({ children, className }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={"w-full text-sm " + (className ?? "")}>{children}</table>
    </div>
  );
}

export function TableHeader({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-gray-100">{children}</thead>;
}

export function TableBody({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="bg-white">{children}</tbody>;
}

export function TableRow({ children }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="border-b last:border-0">{children}</tr>;
}

export function TableHead({ children }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className="px-4 py-2 text-left font-semibold text-gray-700">{children}</th>
  );
}

export function TableCell({ children, className }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={"px-4 py-2 " + (className ?? "")}>{children}</td>;
}
