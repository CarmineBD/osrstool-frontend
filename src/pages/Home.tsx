import { useEffect, useMemo, useState } from "react";
import { MethodsList } from "../features/methods/MethodsList";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsername } from "@/contexts/UsernameContext";
import { useAuth } from "@/auth/AuthProvider";
import { Filter, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { UsernameFetchNotice } from "@/components/UsernameFetchNotice";
import type { MethodsFilters } from "@/lib/api";
import { getUrlByType } from "@/lib/utils";
import { fetchMe } from "@/lib/me";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";
import { useSeo } from "@/hooks/useSeo";
import { OSRS_SKILLS, formatSkillName } from "@/lib/skills";

type SeoConfig = {
  title: string;
  description: string;
  path: string;
  keywords?: string;
};

export type Props = {
  lockedSkill?: string;
  pageTitle?: string;
  seo?: SeoConfig;
};
type SortConfig = {
  sortBy?: MethodsFilters["sortBy"];
  order?: MethodsFilters["order"];
};

const SKILL_OPTIONS = ["combat", ...OSRS_SKILLS] as const;
const METHOD_SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_SEO: SeoConfig = {
  title: "All Methods | OSRSTool",
  description:
    "Listado completo de metodos de money making para OSRS con filtros por categoria, riesgo, AFK y skills.",
  path: "/allMethods",
  keywords: "all methods osrs, osrs moneymaking list, osrstool methods",
};

export function Home({ lockedSkill, pageTitle, seo }: Props) {
  const normalizedLockedSkill = lockedSkill?.trim().toLowerCase();
  const hasLockedSkill = !!normalizedLockedSkill;
  const lockedSkillLabel = normalizedLockedSkill
    ? formatSkillName(normalizedLockedSkill)
    : "";
  const seoConfig = seo ?? DEFAULT_SEO;

  useSeo(seoConfig);

  const { username } = useUsername();
  const normalizedUsername = username.trim();
  const { session } = useAuth();
  const [methodInput, setMethodInput] = useState<string>("");
  const [debouncedMethodInput, setDebouncedMethodInput] = useState<string>("");
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);

  const [category, setCategory] = useState<string>("");
  const [clickIntensity, setClickIntensity] = useState<number>(10000);
  const [appliedClickIntensity, setAppliedClickIntensity] =
    useState<number>(10000);
  const [afkiness, setAfkiness] = useState<number>(0);
  const [appliedAfkiness, setAppliedAfkiness] = useState<number>(0);
  const [riskLevel] = useState<string>("");
  const [givesExperience, setGivesExperience] = useState<boolean | undefined>(
    undefined,
  );
  const [skill, setSkill] = useState<string>(normalizedLockedSkill ?? "");
  const [showProfitables, setShowProfitables] = useState<boolean | undefined>(
    undefined,
  );
  const [enabled, setEnabled] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({});
  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: !!session,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });
  const isSuperAdmin = meData?.data?.role === "super_admin";

  useEffect(() => {
    if (!normalizedLockedSkill) return;

    setSkill(normalizedLockedSkill);
  }, [normalizedLockedSkill]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedMethodInput(methodInput);
    }, METHOD_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [methodInput]);

  const parseInteger = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed)) return undefined;
    return parsed;
  };

  const handleSortChange = (
    sortBy?: MethodsFilters["sortBy"],
    order?: MethodsFilters["order"],
  ) => {
    setSortConfig({ sortBy, order });
  };

  const parsedRiskLevel = useMemo(() => {
    const parsed = parseInteger(riskLevel);
    if (parsed === undefined) return undefined;
    return Math.max(1, Math.min(100, parsed));
  }, [riskLevel]);

  const methodName = useMemo(
    () => debouncedMethodInput.trim(),
    [debouncedMethodInput],
  );

  const appliedFilterCount = useMemo(() => {
    let count = 0;
    if (category) count += 1;
    if (appliedClickIntensity < 10000) count += 1;
    if (appliedAfkiness > 0) count += 1;
    if (parsedRiskLevel !== undefined) count += 1;
    if (!hasLockedSkill && skill) count += 1;
    if (givesExperience !== undefined) count += 1;
    if (showProfitables !== undefined) count += 1;
    if (isSuperAdmin && enabled !== true) count += 1;
    return count;
  }, [
    category,
    appliedClickIntensity,
    appliedAfkiness,
    parsedRiskLevel,
    hasLockedSkill,
    skill,
    givesExperience,
    showProfitables,
    isSuperAdmin,
    enabled,
  ]);

  const appliedFilters = useMemo<MethodsFilters>(
    () => ({
      category: category ? (category as MethodsFilters["category"]) : undefined,
      clickIntensity:
        appliedClickIntensity >= 10000 ? undefined : appliedClickIntensity,
      afkiness: appliedAfkiness <= 0 ? undefined : appliedAfkiness,
      riskLevel: parsedRiskLevel,
      givesExperience,
      enabled: isSuperAdmin ? enabled : undefined,
      skill: normalizedLockedSkill ?? (skill || undefined),
      variants: normalizedLockedSkill ? "all" : undefined,
      showProfitables,
      sortBy: sortConfig.sortBy,
      order: sortConfig.order,
    }),
    [
      category,
      appliedClickIntensity,
      appliedAfkiness,
      parsedRiskLevel,
      givesExperience,
      isSuperAdmin,
      enabled,
      normalizedLockedSkill,
      skill,
      showProfitables,
      sortConfig.sortBy,
      sortConfig.order,
    ],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8 space-y-6">
        {!normalizedUsername ? (
          <UsernameFetchNotice
            resetKey={Boolean(normalizedUsername)}
            className="sticky top-20 z-20"
          />
        ) : null}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold">{pageTitle ?? "All Methods"}</h1>
          {isSuperAdmin && (
            <Button asChild>
              <Link to="/moneyMakingMethod/new">Add new method</Link>
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 max-w-4xl">
          <div className="space-y-1">
            <div className="flex flex-col gap-2 flex-row sm:items-center">
              <div className="relative sm:basis-0 flex-1">
                <Input
                  type="text"
                  placeholder="Buscar por nombre de metodo"
                  value={methodInput}
                  onChange={(e) => setMethodInput(e.target.value)}
                  className="pr-9"
                />
                <Search
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="relative shrink-0"
                aria-expanded={isFiltersOpen}
                aria-label={isFiltersOpen ? "Hide filters" : "Show filters"}
                onClick={() => setIsFiltersOpen((previous) => !previous)}
              >
                <Filter />
                {appliedFilterCount > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                    {appliedFilterCount}
                  </span>
                ) : null}
              </Button>
            </div>
          </div>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              isFiltersOpen
                ? "grid-rows-[1fr] opacity-100"
                : "pointer-events-none grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!isFiltersOpen}
          >
            <div className="overflow-hidden">
              <div className="space-y-3 pt-1">
                <div className=" flex items-center justify-center gap-5 ">
                  <Separator className="bg-border/80 w-100" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Filters
                  </p>
                  <Separator className="bg-border/80 w-100" />
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-3">
                  <div className="space-y-5">
                    <Field className="mx-auto grid gap-2 w-full">
                      <FieldLabel>Category</FieldLabel>
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
                          <SelectItem
                            value="__none__"
                            className="text-muted-foreground"
                          >
                            None
                          </SelectItem>
                          <SelectItem value="combat">Combat</SelectItem>
                          <SelectItem value="collecting">Collecting</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="skilling">Skilling</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field className="mx-auto grid gap-2 w-full">
                      <FieldLabel>Skill</FieldLabel>
                      <Select
                        disabled={lockedSkillLabel ? true : false}
                        value={
                          lockedSkillLabel
                            ? lockedSkillLabel.toLowerCase()
                            : skill
                        }
                        onValueChange={(value) =>
                          setSkill(value === "__none__" ? "" : value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Skill" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="__none__"
                            className="text-muted-foreground"
                          >
                            None
                          </SelectItem>
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
                      {hasLockedSkill ? (
                        <FieldDescription>
                          Skill locked: {lockedSkillLabel}
                        </FieldDescription>
                      ) : null}
                    </Field>
                  </div>

                  <div className="space-y-5">
                    <Field className="mx-auto grid gap-2 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <FieldLabel>Click intensity</FieldLabel>
                      </div>
                      <Slider
                        min={0}
                        max={10000}
                        step={200}
                        value={[clickIntensity]}
                        onValueChange={(value) =>
                          setClickIntensity(value[0] ?? 10000)
                        }
                        onValueCommit={(value) => {
                          const nextValue = value[0] ?? 10000;
                          setClickIntensity(nextValue);
                          setAppliedClickIntensity(nextValue);
                        }}
                      />
                      <FieldDescription>
                        {clickIntensity >= 10000
                          ? "Unlimited"
                          : clickIntensity + " clicks per hour"}
                      </FieldDescription>
                    </Field>
                    <Field className="mx-auto grid gap-2 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <FieldLabel>AFK %</FieldLabel>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        fillSide="end"
                        value={[afkiness]}
                        onValueChange={(value) => setAfkiness(value[0] ?? 0)}
                        onValueCommit={(value) => {
                          const nextValue = value[0] ?? 0;
                          setAfkiness(nextValue);
                          setAppliedAfkiness(nextValue);
                        }}
                      />
                      <FieldDescription>
                        {afkiness === 0 ? "No minimum" : `${afkiness}% or more`}
                      </FieldDescription>
                    </Field>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Field className="flex items-center gap-2">
                        <FieldLabel>Profitables</FieldLabel>
                        <div>
                          <Switch
                            checked={showProfitables ?? false}
                            onCheckedChange={(checked) =>
                              setShowProfitables(checked ? true : undefined)
                            }
                          />
                          <FieldDescription>
                            {showProfitables
                              ? "Show only profitable methods"
                              : "Show all"}
                          </FieldDescription>
                        </div>
                      </Field>
                    </div>
                    <Field className="flex items-center gap-2">
                      <FieldLabel>Gives experience</FieldLabel>
                      <div>
                        <Switch
                          checked={givesExperience ?? false}
                          onCheckedChange={(checked) =>
                            setGivesExperience(checked ? true : undefined)
                          }
                        />
                        <FieldDescription>
                          {givesExperience
                            ? "Show only methods that gives experience"
                            : "Show all"}
                        </FieldDescription>
                      </div>
                    </Field>
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
                <Separator className="bg-border/80" />
              </div>
            </div>
          </div>
        </div>
        <MethodsList
          username={username}
          name={methodName}
          filters={appliedFilters}
          isSkillTable={hasLockedSkill}
          highlightSkill={normalizedLockedSkill}
          sortBy={sortConfig.sortBy}
          order={sortConfig.order}
          onSortChange={handleSortChange}
        />
      </div>
    </div>
  );
}
