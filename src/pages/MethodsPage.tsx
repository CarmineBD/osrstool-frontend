import React, { useState } from "react";
import { useMethods } from "@/features/methods/hooks";
import { MethodsTable } from "@/features/methods/components/MethodsTable";

export default function MethodsPage() {
  const [username, setUsername] = useState("");
  const [queryUsername, setQueryUsername] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useMethods(queryUsername, page);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    setQueryUsername(username.trim());
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Money making methods</h1>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          className="border px-2 py-1 rounded flex-1"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-1 rounded">
          Submit
        </button>
      </form>

      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-500">{`${error}`}</p>}
      {data && <MethodsTable methods={data.data} />}

      {data && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>{data.meta.page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={data.data.length < data.meta.perPage}
            className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
          {isFetching && <span className="text-xs ml-2">Updating…</span>}
        </div>
      )}
    </div>
  );
}
