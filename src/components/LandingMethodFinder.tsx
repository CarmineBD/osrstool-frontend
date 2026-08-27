import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { AnimatedProfitValue } from "@/components/AnimatedProfitValue";
import { PixelArtIcon } from "@/components/method-editor/MethodEditorPrimitives";
import { UsernameLookupErrorMessage } from "@/components/UsernameLookupErrorMessage";
import {
  PUBLIC_BODY_CLASS,
  PUBLIC_LINK_CLASS,
} from "@/components/public-page/publicPageStyles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/auth/AuthProvider";
import { useUsername } from "@/contexts/UsernameContext";
import {
  DEFAULT_IGNORED_METHOD_TAGS,
  fetchIconRecords,
  fetchMethods,
  getIconReferenceKey,
  normalizeIconSource,
  type IconRecord,
  type MethodsFilters,
  type Variant,
} from "@/lib/api";
import {
  QUERY_REFETCH_INTERVAL_MS,
  QUERY_STALE_TIME_MS,
} from "@/lib/queryRefresh";
import { cn, formatNumber, getUrlByType } from "@/lib/utils";
import { normalizeBoundedText, USERNAME_MAX_LENGTH } from "@/lib/validation";

type FinderGoal = "money" | "skill";
type FinderPreference = "fastest" | "low-intensity" | "secondary-reward";

const PREFERENCE_OPTIONS: Array<{
  value: FinderPreference;
  label: string;
}> = [
  { value: "fastest", label: "⚡ Fastest" },
  { value: "low-intensity", label: "😴 Less intensive" },
  { value: "secondary-reward", label: "" },
];

const QUICK_DEMO_SKILLS = [
  "herblore",
  "fletching",
  "crafting",
  "magic",
] as const;
const MEMBERS_ONLY_QUICK_DEMO_SKILLS = new Set(["herblore", "fletching"]);

function getFinderFilters({
  goal,
  preference,
  skill,
  lowBudget,
  onlyF2p,
}: {
  goal: FinderGoal;
  preference: FinderPreference;
  skill: string;
  lowBudget: boolean;
  onlyF2p: boolean;
}): MethodsFilters {
  const filters: MethodsFilters = {
    enabled: true,
    ignoredTags: lowBudget
      ? [...DEFAULT_IGNORED_METHOD_TAGS, "high_investment_required"]
      : DEFAULT_IGNORED_METHOD_TAGS,
    showOnlyFreeToPlay: onlyF2p,
    sortBy: goal === "skill" ? "xpHour" : "highProfit",
    order: "desc",
  };

  if (goal === "skill") {
    filters.skill = skill;
    filters.variants = "all";
  }

  if (preference === "low-intensity") {
    filters.afkiness = 70;
    filters.sortBy = "afkiness";
  }

  if (preference === "secondary-reward") {
    if (goal === "money") {
      filters.givesExperience = true;
    } else {
      filters.showProfitables = true;
      filters.sortBy = "highProfit";
    }
  }

  return filters;
}

function getXpPerHour(
  variant: Variant,
  selectedSkill?: string,
): number | undefined {
  const entries = Array.isArray(variant.xpHour) ? variant.xpHour : [];
  const selectedEntry = selectedSkill
    ? entries.find((entry) => entry.skill.toLowerCase() === selectedSkill)
    : undefined;

  if (selectedEntry && Number.isFinite(selectedEntry.experience)) {
    return selectedEntry.experience;
  }

  const total = entries.reduce(
    (sum, entry) =>
      Number.isFinite(entry.experience) ? sum + entry.experience : sum,
    0,
  );

  return total > 0 ? total : undefined;
}

export function LandingMethodFinder() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const {
    username,
    player,
    lookupPlayer,
    clearUsername,
    isPlayerLookupPending,
    manualLookupCooldownRemaining,
    manualLookupCooldownUsername,
    userError,
  } = useUsername();
  const [goal, setGoal] = useState<FinderGoal>("money");
  const [preference, setPreference] = useState<FinderPreference>("fastest");
  const [skill, setSkill] = useState("crafting");
  const [lowBudget, setLowBudget] = useState(false);
  const [onlyF2p, setOnlyF2p] = useState(false);
  const [usernameInput, setUsernameInput] = useState(username);

  useEffect(() => {
    setUsernameInput(username);
  }, [username]);

  const handleUsernameFetch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = normalizeBoundedText(
      usernameInput.trim(),
      USERNAME_MAX_LENGTH,
    );

    if (!normalizedUsername) {
      clearUsername();
      return;
    }

    if (!session) {
      navigate("/login", { state: { from: { pathname: "/" } } });
      return;
    }

    await lookupPlayer(normalizedUsername);
  };

  const isFetchCoolingDown =
    manualLookupCooldownRemaining > 0 &&
    manualLookupCooldownUsername ===
      normalizeBoundedText(
        usernameInput.trim(),
        USERNAME_MAX_LENGTH,
      ).toLowerCase();
  const filters = useMemo(
    () => getFinderFilters({ goal, preference, skill, lowBudget, onlyF2p }),
    [goal, lowBudget, onlyF2p, preference, skill],
  );
  const { data, error, isFetching, isLoading } = useQuery({
    queryKey: ["landing-method-finder", player, filters],
    queryFn: () => fetchMethods(player ?? undefined, 1, undefined, filters),
    placeholderData: (previousData) => previousData,
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
    retry: false,
  });
  const resultRows = useMemo(
    () =>
      (data?.methods ?? [])
        .flatMap((method) =>
          method.variants.map((variant, index) => ({
            id: `${method.id}-${variant.id ?? variant.slug ?? index}`,
            method,
            variant,
            variantCount: method.variantCount ?? method.variants.length,
          })),
        )
        .slice(0, 3),
    [data?.methods],
  );
  const iconReferences = useMemo(
    () =>
      resultRows.flatMap(({ variant }) =>
        Number.isInteger(variant.icon_id)
          ? [
              {
                id: variant.icon_id as number,
                source: normalizeIconSource(variant.iconSource),
              },
            ]
          : [],
      ),
    [resultRows],
  );
  const { data: icons = {} } = useQuery<Record<string, IconRecord>>({
    queryKey: [
      "landing-method-finder-icons",
      iconReferences.map(getIconReferenceKey).sort(),
    ],
    queryFn: () => fetchIconRecords(iconReferences),
    enabled: iconReferences.length > 0,
    staleTime: QUERY_STALE_TIME_MS,
  });
  const isResultsLoading = isLoading || isFetching;

  return (
    <section aria-labelledby="method-finder-heading">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          Quick demo
        </p>
        <h2
          id="method-finder-heading"
          className="mt-2 text-2xl font-bold text-foreground"
        >
          What do you feel like doing?
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <fieldset>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { value: "money", label: "Make money" },
                { value: "skill", label: "Train a skill" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={goal === option.value}
                  onClick={() => setGoal(option.value as FinderGoal)}
                  className={cn(
                    "min-h-11 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
                    goal === option.value
                      ? "border-brand/35 bg-brand text-brand-foreground"
                      : "border-border/70 bg-background/40 text-foreground hover:bg-brand-soft",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {goal === "skill" ? (
            <div className="mt-5">
              <p className="text-sm font-medium text-foreground">
                Skill to train
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_DEMO_SKILLS.map((skillOption) => {
                  const iconUrl = getUrlByType(skillOption);
                  const isSelected = skill === skillOption;
                  const isMembersOnly =
                    MEMBERS_ONLY_QUICK_DEMO_SKILLS.has(skillOption);
                  const skillName = `${skillOption.charAt(0).toUpperCase()}${skillOption.slice(1)}`;

                  return (
                    <Tooltip key={skillOption}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={skillName}
                          aria-pressed={isSelected}
                          onClick={() => setSkill(skillOption)}
                          disabled={onlyF2p && isMembersOnly}
                          className={cn(
                            "flex size-10 items-center justify-center rounded-md border bg-background/40 p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
                            isSelected
                              ? "border-brand/35 bg-brand-soft"
                              : "border-border/70 hover:bg-brand-soft",
                          )}
                        >
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt=""
                              className="max-h-full max-w-full object-contain"
                              loading="lazy"
                            />
                          ) : null}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{skillName}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              <Link
                to="/skilling"
                className={`mt-3 inline-block text-xs ${PUBLIC_LINK_CLASS}`}
              >
                See all skills
              </Link>
            </div>
          ) : null}

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-foreground">
              What matters most?
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {PREFERENCE_OPTIONS.map((option) => {
                const label =
                  option.value === "secondary-reward"
                    ? goal === "money"
                      ? "⏫ Earn some XP in the process"
                      : "🪙 Earn some money in the process"
                    : option.label;
                const selected = preference === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setPreference(option.value)}
                    className={cn(
                      "min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
                      selected
                        ? "border-brand/35 bg-brand-soft text-brand-soft-foreground"
                        : "border-border/70 bg-background/40 text-foreground hover:bg-brand-soft",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={lowBudget}
                onChange={(event) => setLowBudget(event.target.checked)}
                className="h-4 w-4 rounded border-border accent-brand"
              />
              Low budget
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={onlyF2p}
                onChange={(event) => {
                  const nextOnlyF2p = event.target.checked;
                  setOnlyF2p(nextOnlyF2p);
                  if (
                    nextOnlyF2p &&
                    MEMBERS_ONLY_QUICK_DEMO_SKILLS.has(skill)
                  ) {
                    setSkill("crafting");
                  }
                }}
                className="h-4 w-4 rounded border-border accent-brand"
              />
              Only F2P
            </label>
          </div>

          <div className="mt-5">
            <label
              htmlFor="landing-osrs-username"
              className="text-sm font-medium text-foreground"
            >
              OSRS username
            </label>
            <form className="mt-2 flex gap-2" onSubmit={handleUsernameFetch}>
              <Input
                id="landing-osrs-username"
                type="text"
                className="w-[18ch] shrink-0"
                placeholder="username"
                maxLength={USERNAME_MAX_LENGTH}
                value={usernameInput}
                readOnly={!session}
                onChange={(event) => {
                  if (!session) return;
                  setUsernameInput(
                    normalizeBoundedText(
                      event.target.value,
                      USERNAME_MAX_LENGTH,
                    ),
                  );
                }}
              />
              <Button
                type="submit"
                disabled={
                  session ? isPlayerLookupPending || isFetchCoolingDown : false
                }
              >
                {isPlayerLookupPending ? "Fetching..." : "Fetch"}
              </Button>
            </form>
            {!session ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Sign in to fetch and filter with your OSRS stats.
              </p>
            ) : userError ? (
              <div className="mt-2 text-sm text-destructive" role="alert">
                <UsernameLookupErrorMessage
                  message={userError}
                  helperClassName="text-[13px] leading-[18px] text-destructive/85"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-border/60 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              Your matches
            </h3>
            <span className="text-xs font-medium text-muted-foreground">
              Top 3
            </span>
          </div>

          <div className="mt-3">
            {isResultsLoading ? (
              <div
                aria-label="Loading matches"
                role="status"
                className="space-y-3"
              >
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 border-b border-border/60 py-3 last:border-b-0"
                  >
                    <Skeleton className="h-[30px] w-[30px]" />
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 w-40" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className={PUBLIC_BODY_CLASS}>
                Matches are unavailable right now.
              </p>
            ) : resultRows.length === 0 ? (
              <p className={PUBLIC_BODY_CLASS}>
                No methods match these choices yet.
              </p>
            ) : (
              <div>
                {resultRows.map(({ id, method, variant, variantCount }) => {
                  const iconReference = variant.icon_id
                    ? {
                        id: variant.icon_id,
                        source: normalizeIconSource(variant.iconSource),
                      }
                    : undefined;
                  const xpPerHour = getXpPerHour(
                    variant,
                    goal === "skill" ? skill : undefined,
                  );
                  const variantSlug = variant.slug ?? variant.id;
                  const href =
                    variantCount > 1 && variantSlug
                      ? `/moneyMakingMethod/${method.slug}/${variantSlug}`
                      : `/moneyMakingMethod/${method.slug}`;

                  return (
                    <Link
                      key={id}
                      to={href}
                      className="flex items-center gap-3 border-b border-border/60 py-3 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
                    >
                      <PixelArtIcon
                        src={
                          iconReference
                            ? icons[getIconReferenceKey(iconReference)]?.iconUrl
                            : undefined
                        }
                        alt={variant.label ? `${variant.label} icon` : ""}
                        className="h-[30px] w-[30px]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-link transition-colors hover:text-link-hover hover:underline">
                          {method.name}
                        </p>
                        {variant.label.toLowerCase() !==
                        method.name.toLowerCase() ? (
                          <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                            {variant.label}
                          </p>
                        ) : null}
                      </div>
                      <div className="grid w-[174px] grid-cols-3 gap-2 text-right sm:w-[196px]">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            GP/hr
                          </p>
                          <p className="text-xs font-bold text-foreground">
                            {typeof variant.highProfit === "number" ? (
                              <AnimatedProfitValue value={variant.highProfit} />
                            ) : (
                              "N/A"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            XP/hr
                          </p>
                          <p className="text-xs font-bold text-foreground">
                            {xpPerHour !== undefined
                              ? formatNumber(xpPerHour)
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            AFK
                          </p>
                          <p className="text-xs font-bold text-foreground">
                            {variant.afkiness !== undefined
                              ? `${variant.afkiness}%`
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            to="/allMethods"
            className={`mt-4 inline-block text-sm ${PUBLIC_LINK_CLASS}`}
          >
            Explore all methods
          </Link>
        </div>
      </div>
    </section>
  );
}
