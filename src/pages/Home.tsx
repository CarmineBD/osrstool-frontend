import { useEffect, useState, type FormEvent } from "react";
import { MethodsList } from "../features/methods/MethodsList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsername } from "@/contexts/UsernameContext";

export type Props = Record<string, never>;

export function Home(_props: Props) {
  void _props;
  const { username, setUsername, userError, setUserError } = useUsername();
  const [input, setInput] = useState<string>(username);
  const [methodInput, setMethodInput] = useState<string>("");
  const [methodName, setMethodName] = useState<string>("");

  useEffect(() => {
    setInput(username);
  }, [username]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUsername(input.trim());
  };

  const handleMethodSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMethodName(methodInput.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold">OSRS Moneymaking Methods</h1>
        <div className="flex flex-col gap-3 max-w-xl">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter username"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button type="submit">Buscar</Button>
          </form>
          <form onSubmit={handleMethodSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Buscar por nombre de método"
              value={methodInput}
              onChange={(e) => setMethodInput(e.target.value)}
            />
            <Button type="submit">Filtrar</Button>
          </form>
        </div>
        {userError && (
          <p className="text-red-500 text-sm mt-1">{userError}</p>
        )}
        <MethodsList username={username} name={methodName} />
      </div>
    </div>
  );
}
