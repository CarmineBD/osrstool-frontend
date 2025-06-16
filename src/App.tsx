// src/App.tsx
import React from "react";
import { MethodsTable } from "@/features/methods/MethodsTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function App() {
  const [username, setUsername] = React.useState("");
  const [submittedUsername, setSubmittedUsername] = React.useState<string | undefined>();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedUsername(username || undefined);
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Money Making methods</h1>
        <p className="text-gray-600">Real time profitable methods with your stats</p>
      </div>
      <form onSubmit={handleSubmit} className="flex items-center space-x-2 w-full max-w-md justify-center">
        <Input
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Button type="submit">Submit</Button>
      </form>
      <MethodsTable username={submittedUsername} />
    </div>
  );
}

export default App;
