import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MethodsList } from "../features/methods/MethodsList";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsername } from "@/contexts/UsernameContext";
import { useAuth } from "@/auth/AuthProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { MethodsFilters } from "@/lib/api";
import { getUrlByType } from "@/lib/utils";
import { fetchMe } from "@/lib/me";

export type Props = Record<string, never>;
const LOGIN_REQUIRED_MESSAGE = "sign-in/login to fetch data by osrs usernames";
type SortConfig = {
  sortBy?: MethodsFilters["sortBy"];
  order?: MethodsFilters["order"];
};

const SKILL_OPTIONS = [
  "combat",
  "attack",
  "strength",
  "defence",
  "ranged",
  "prayer",
  "magic",
  "runecraft",
  "construction",
  "hitpoints",
  "agility",
  "herblore",
  "thieving",
  "crafting",
  "fletching",
  "slayer",
  "hunter",
  "mining",
  "smithing",
  "fishing",
  "cooking",
  "firemaking",
  "woodcutting",
  "farming",
  "sailing",
] as const;

export function Home(_props: Props) {
  void _props;
  const { username, setUsername, userError, setUserError } = useUsername();
  const { session, isLoading } = useAuth();
  const effectiveUsername = session ? username : "";
  const [input, setInput] = useState<string>(effectiveUsername);
  const [methodInput, setMethodInput] = useState<string>("");
  const [methodName, setMethodName] = useState<string>("");

  const [category, setCategory] = useState<string>("");
  const [clickIntensity, setClickIntensity] = useState<number>(10000);
  const [afkiness, setAfkiness] = useState<number>(0);
  const [riskLevel, setRiskLevel] = useState<string>("");
  const [givesExperience, setGivesExperience] = useState<boolean | undefined>(
    undefined
  );
  const [skill, setSkill] = useState<string>("");
  const [showProfitables, setShowProfitables] = useState<
    boolean | undefined
  >(undefined);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({});
  const [filters, setFilters] = useState<MethodsFilters>({
    enabled: true,
  });
  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: !!session,
    retry: false,
  });
  const isSuperAdmin = meData?.data?.role === "super_admin";

  useEffect(() => {
    if (isLoading) return;
    setInput(effectiveUsername);
  }, [effectiveUsername, isLoading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!session) {
      setUserError(LOGIN_REQUIRED_MESSAGE);
      return;
    }
    setUserError(null);
    setUsername(input.trim());
  };

  const handleUsernameInputInteraction = () => {
    if (!session) {
      setUserError(LOGIN_REQUIRED_MESSAGE);
    }
  };

  const handleMethodSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMethodName(methodInput.trim());
  };

  const parseInteger = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed)) return undefined;
    return parsed;
  };

  const handleFiltersSubmit = (e: FormEvent) => {
    e.preventDefault();

    const parsedClickIntensity =
      clickIntensity >= 10000 ? undefined : clickIntensity;
    const parsedAfkiness = afkiness <= 0 ? undefined : afkiness;
    const parsedRiskLevel = parseInteger(riskLevel);
    const boundedRiskLevel =
      parsedRiskLevel === undefined
        ? undefined
        : Math.max(1, Math.min(100, parsedRiskLevel));

    setFilters({
      category: category ? (category as MethodsFilters["category"]) : undefined,
      clickIntensity: parsedClickIntensity,
      afkiness: parsedAfkiness,
      riskLevel: boundedRiskLevel,
      givesExperience,
      enabled: isSuperAdmin ? enabled : undefined,
      skill: skill || undefined,
      showProfitables,
    });

    if (parsedRiskLevel !== undefined && parsedRiskLevel !== boundedRiskLevel) {
      setRiskLevel(String(boundedRiskLevel));
    }
  };

  const handleSortChange = (
    sortBy?: MethodsFilters["sortBy"],
    order?: MethodsFilters["order"]
  ) => {
    setSortConfig({ sortBy, order });
  };

  const appliedFilters = useMemo<MethodsFilters>(
    () => ({
      ...filters,
      sortBy: sortConfig.sortBy,
      order: sortConfig.order,
    }),
    [filters, sortConfig.order, sortConfig.sortBy]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold">OSRS Moneymaking Methods</h1>
          {isSuperAdmin && (
            <Button asChild>
              <Link to="/moneyMakingMethod/new">Add new method</Link>
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-1">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter username"
                value={input}
                readOnly={!session}
                onClick={handleUsernameInputInteraction}
                onFocus={handleUsernameInputInteraction}
                onChange={(e) => {
                  if (!session) return;
                  setInput(e.target.value);
                }}
              />
              <Button type="submit">Buscar</Button>
            </div>
            {userError && <p className="text-red-500 text-sm">{userError}</p>}
          </form>

          <form onSubmit={handleFiltersSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              <Select
                value={category}
                onValueChange={(value) =>
                  setCategory(value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin filtro</SelectItem>
                  <SelectItem value="combat">combat</SelectItem>
                  <SelectItem value="collecting">collecting</SelectItem>
                  <SelectItem value="processing">processing</SelectItem>
                  <SelectItem value="skilling">skilling</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-2 rounded-md border bg-background px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Click intensity</span>
                  <span>{clickIntensity >= 10000 ? "unlimited" : clickIntensity}</span>
                </div>
                <Slider
                  min={100}
                  max={10000}
                  step={100}
                  value={[clickIntensity]}
                  onValueChange={(value) => setClickIntensity(value[0] ?? 10000)}
                />
              </div>

              <div className="space-y-2 rounded-md border bg-background px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span>min AFK %</span>
                  <span>{afkiness === 0 ? "No min." : `${afkiness}% or more`}</span>
                </div>
                
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  fillSide="end"
                  value={[afkiness]}
                  onValueChange={(value) => setAfkiness(value[0] ?? 0)}
                />
              </div>

              <Input
                type="number"
                step={1}
                min={1}
                max={100}
                placeholder="Risk level (1-100)"
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
              />

              <Select
                value={skill}
                onValueChange={(value) =>
                  setSkill(value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Skill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin filtro</SelectItem>
                  {SKILL_OPTIONS.map((skillOption) => {
                    const iconUrl = getUrlByType(skillOption);
                    return (
                      <SelectItem key={skillOption} value={skillOption}>
                        <span className="flex items-center gap-2">
                          {iconUrl ? (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                              <img
                                src={iconUrl}
                                alt={`${skillOption}_icon`}
                                className="max-h-full max-w-full object-contain"
                                loading="lazy"
                              />
                            </span>
                          ) : null}
                          <span>{skillOption}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Switch
                  checked={givesExperience ?? false}
                  onCheckedChange={(checked) =>
                    setGivesExperience(checked ? true : undefined)
                  }
                />
                <span className="text-sm">givesExperience</span>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={showProfitables ?? false}
                  onCheckedChange={(checked) =>
                    setShowProfitables(checked ? true : undefined)
                  }
                />
                <span className="text-sm">showProfitables</span>
              </div>

              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => setEnabled(checked)}
                  />
                  <span className="text-sm">enabled</span>
                </div>
              )}
            </div>
            <Button type="submit">Aplicar filtros</Button>
          </form>

          <form onSubmit={handleMethodSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Buscar por nombre de metodo"
              value={methodInput}
              onChange={(e) => setMethodInput(e.target.value)}
            />
            <Button type="submit">Filtrar</Button>
          </form>
        </div>
        <MethodsList
          username={effectiveUsername}
          name={methodName}
          filters={appliedFilters}
          sortBy={sortConfig.sortBy}
          order={sortConfig.order}
          onSortChange={handleSortChange}
        />
      </div>
    </div>
  );
}
