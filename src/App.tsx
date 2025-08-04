// ...existing code...
import React, { useState } from "react";
import { MethodsList } from "./features/methods/MethodsList";

function App() {
  const [username, setUsername] = useState("");
  const [input, setInput] = useState("");

  console.log("type of username:", typeof username);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUsername(input.trim());
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">OSRS Moneymaking Methods</h1>
      <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Enter username"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Buscar
        </button>
      </form>
      <MethodsList username={username} />
    </div>
  );
}

export default App;
// ...existing code...
