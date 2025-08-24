import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsername } from "@/contexts/UsernameContext";

export type Props = { hideInput?: boolean };

export function Nav({ hideInput }: Props) {
  const { username, setUsername, userError, setUserError } = useUsername();
  const [input, setInput] = useState<string>(username);
  const [seconds, setSeconds] = useState(60);
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();

  useEffect(() => {
    setInput(username);
  }, [username]);

  useEffect(() => {
    setSeconds(60);
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          if (location.pathname === "/") {
            queryClient.invalidateQueries({ queryKey: ["methods", username] });
          } else if (id) {
            queryClient.invalidateQueries({ queryKey: ["methodDetail", id, username] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["variantHistory"] });
          }
          return 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [location.pathname, id, username, queryClient]);

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
      <div className="flex items-center gap-4">
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
        <span className="text-sm text-gray-500">
          Actualización en: {seconds}s
        </span>
      </div>
    </nav>
  );
}
