import { useEffect, useState, type FormEvent } from "react";
import { MethodsList } from "../features/methods/MethodsList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsername } from "@/contexts/UsernameContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { MethodsFilters } from "@/lib/api";

export type Props = Record<string, never>;

export function Home(_props: Props) {
  void _props;
  const { username, setUsername, userError, setUserError } = useUsername();
  const [input, setInput] = useState<string>(username);
  const [methodInput, setMethodInput] = useState<string>("");
  const [methodName, setMethodName] = useState<string>("");

  const [category, setCategory] = useState<string>("");
  const [clickIntensity, setClickIntensity] = useState<string>("");
  const [afkiness, setAfkiness] = useState<string>("");
  const [riskLevel, setRiskLevel] = useState<string>("");
  const [givesExperience, setGivesExperience] = useState<boolean | undefined>(
    undefined
  );
  const [skill, setSkill] = useState<string>("");
  const [showProfitables, setShowProfitables] = useState<
    boolean | undefined
  >(undefined);
  const [sortBy, setSortBy] = useState<MethodsFilters["sortBy"]>("highProfit");
  const [order, setOrder] = useState<MethodsFilters["order"]>("desc");
  const [filters, setFilters] = useState<MethodsFilters>({
    sortBy: "highProfit",
    order: "desc",
  });

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

  const parseInteger = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed)) return undefined;
    return parsed;
  };

  const handleFiltersSubmit = (e: FormEvent) => {
    e.preventDefault();

    const parsedClickIntensity = parseInteger(clickIntensity);
    const parsedAfkiness = parseInteger(afkiness);
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
      skill: skill || undefined,
      showProfitables,
      sortBy,
      order,
    });

    if (parsedRiskLevel !== undefined && parsedRiskLevel !== boundedRiskLevel) {
      setRiskLevel(String(boundedRiskLevel));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold">OSRS Moneymaking Methods</h1>
        <div className="flex flex-col gap-3 max-w-4xl">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter username"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button type="submit">Buscar</Button>
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

              <Input
                type="number"
                step={1}
                min={0}
                placeholder="Click intensity"
                value={clickIntensity}
                onChange={(e) => setClickIntensity(e.target.value)}
              />

              <Input
                type="number"
                step={1}
                min={0}
                placeholder="AFKiness"
                value={afkiness}
                onChange={(e) => setAfkiness(e.target.value)}
              />

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
                  <SelectItem value="combat">combat</SelectItem>
                  <SelectItem value="attack">attack</SelectItem>
                  <SelectItem value="strength">strength</SelectItem>
                  <SelectItem value="defence">defence</SelectItem>
                  <SelectItem value="ranged">ranged</SelectItem>
                  <SelectItem value="prayer">prayer</SelectItem>
                  <SelectItem value="magic">magic</SelectItem>
                  <SelectItem value="runecraft">runecraft</SelectItem>
                  <SelectItem value="construction">construction</SelectItem>
                  <SelectItem value="hitpoints">hitpoints</SelectItem>
                  <SelectItem value="agility">agility</SelectItem>
                  <SelectItem value="herblore">herblore</SelectItem>
                  <SelectItem value="thieving">thieving</SelectItem>
                  <SelectItem value="crafting">crafting</SelectItem>
                  <SelectItem value="fletching">fletching</SelectItem>
                  <SelectItem value="slayer">slayer</SelectItem>
                  <SelectItem value="hunter">hunter</SelectItem>
                  <SelectItem value="mining">mining</SelectItem>
                  <SelectItem value="smithing">smithing</SelectItem>
                  <SelectItem value="fishing">fishing</SelectItem>
                  <SelectItem value="cooking">cooking</SelectItem>
                  <SelectItem value="firemaking">firemaking</SelectItem>
                  <SelectItem value="woodcutting">woodcutting</SelectItem>
                  <SelectItem value="farming">farming</SelectItem>
                  <SelectItem value="sailing">sailing</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as MethodsFilters["sortBy"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clickIntensity">clickIntensity</SelectItem>
                  <SelectItem value="afkiness">afkiness</SelectItem>
                  <SelectItem value="xpHour">xpHour</SelectItem>
                  <SelectItem value="highProfit">highProfit</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={order}
                onValueChange={(value) => setOrder(value as MethodsFilters["order"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">asc</SelectItem>
                  <SelectItem value="desc">desc</SelectItem>
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
        {userError && <p className="text-red-500 text-sm mt-1">{userError}</p>}
        <MethodsList username={username} name={methodName} filters={filters} />
      </div>
    </div>
  );
}
