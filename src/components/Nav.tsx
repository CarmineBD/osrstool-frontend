import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsername } from "@/contexts/UsernameContext";

export type Props = { hideInput?: boolean };

export function Nav({ hideInput }: Props) {
  const { username, setUsername, userError, setUserError } = useUsername();
  const [input, setInput] = useState<string>(username);

  useEffect(() => {
    setInput(username);
  }, [username]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUsername(input.trim());
  };

  return (
    <nav className="flex items-center justify-between p-4 bg-white shadow">
      <Link to="/" className="flex items-center space-x-2">
        <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
      </Link>
      {!hideInput && (
        <div className="flex flex-col gap-1">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter username"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button type="submit">Buscar</Button>
          </form>
          {userError && (
            <p className="text-red-500 text-sm">{userError}</p>
          )}
        </div>
      )}
    </nav>
  );
}
