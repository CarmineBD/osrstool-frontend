import { useState } from "react";
import type { FormEvent } from "react";
import { MethodsList } from "../features/methods/MethodsList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function Home() {
  const [username, setUsername] = useState("");
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setUsername(input.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold">OSRS Moneymaking Methods</h1>
        <form onSubmit={handleSubmit} className="flex max-w-md gap-2">
          <Input
            type="text"
            placeholder="Enter username"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit">Buscar</Button>
        </form>
        <MethodsList username={username} />
      </div>
    </div>
  );
}
