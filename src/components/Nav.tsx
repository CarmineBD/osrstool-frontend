import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { IconBrandDiscord } from "@tabler/icons-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UsernameLookupErrorMessage } from "@/components/UsernameLookupErrorMessage";
import { useUsername } from "@/contexts/UsernameContext";
import { useAuth } from "@/auth/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { formatSkillName } from "@/lib/skills";
import { cn, getUrlByType } from "@/lib/utils";
import { OPEN_NAV_USERNAME_EVENT } from "@/lib/events";
import { fetchMe, getMeQueryKey } from "@/lib/me";
import { fetchMethodsSkillsSummary } from "@/lib/api";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";
import { getRuntimeEnvironmentLabel } from "@/lib/runtimeEnv";
import { normalizeBoundedText, USERNAME_MAX_LENGTH } from "@/lib/validation";
import { OFFICIAL_DISCORD_URL } from "@/lib/community";

export type Props = { hideInput?: boolean };
const LOGIN_REQUIRED_MESSAGE = "sign-in/login to fetch data by osrs usernames";
const MOBILE_FETCH_USER_SECTION = "mobile-fetch-user";
const SKILL_TAB_ORDER = [
  "attack",
  "hitpoints",
  "mining",
  "strength",
  "agility",
  "smithing",
  "defence",
  "herblore",
  "fishing",
  "ranged",
  "thieving",
  "cooking",
  "prayer",
  "crafting",
  "firemaking",
  "magic",
  "fletching",
  "woodcutting",
  "runecraft",
  "slayer",
  "farming",
  "construction",
  "hunter",
  "sailing",
] as const;
const SKILL_TAB_COLUMNS = [
  SKILL_TAB_ORDER.slice(0, 12),
  SKILL_TAB_ORDER.slice(12),
];
const SKILL_TILE_GRID_CLASS =
  "grid grid-cols-[repeat(3,3.5rem)] justify-center gap-2";
const SKILL_COLUMNS_GRID_CLASS =
  "grid grid-cols-[repeat(2,11.5rem)] justify-center gap-2";
const SKILL_TILE_CLASS =
  "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex size-14 flex-col items-center justify-center gap-1 rounded-md text-center text-[10px] font-medium leading-none no-underline outline-hidden transition-colors duration-200 select-none";
const UNAVAILABLE_SKILL_TILE_CLASS =
  "flex size-14 cursor-not-allowed flex-col items-center justify-center gap-1 rounded-md text-center text-[10px] font-medium leading-none text-muted-foreground opacity-45 select-none";
const MOBILE_SKILL_OVERVIEW_LINK_CLASS =
  "from-muted/50 to-muted hover:bg-accent/70 focus:bg-accent/70 flex h-10 w-full items-center justify-center rounded-md bg-linear-to-r px-3 text-sm font-medium no-underline outline-hidden transition-colors duration-200";

export function Nav({ hideInput }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    username,
    lookupPlayer,
    isPlayerLookupPending,
    manualLookupCooldownRemaining,
    userError,
    setUserError,
  } = useUsername();
  const { session } = useAuth();
  const { data: meData } = useQuery({
    queryKey: getMeQueryKey(session?.user?.id),
    queryFn: fetchMe,
    enabled: !!session,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });
  const { data: skillsSummary } = useQuery({
    queryKey: ["methodsSkillsSummary", undefined, undefined],
    queryFn: () => fetchMethodsSkillsSummary(),
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });
  const [input, setInput] = useState<string>(username);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileAccordionValue, setMobileAccordionValue] = useState<string[]>(
    [],
  );
  const isSuperAdmin = meData?.data?.role === "super_admin";
  const avatarUrl =
    typeof session?.user?.user_metadata?.avatar_url === "string"
      ? session.user.user_metadata.avatar_url
      : undefined;
  const avatarFallback =
    (session?.user?.email ?? "A").trim().charAt(0).toUpperCase() || "A";
  const runtimeEnvironmentLabel = getRuntimeEnvironmentLabel(
    window.location.hostname,
    import.meta.env.DEV,
  );
  const isSkillUnavailable = (skill: (typeof SKILL_TAB_ORDER)[number]) =>
    skillsSummary !== undefined &&
    (skillsSummary.data[skill]?.officialVariantCount ?? 0) === 0;

  useEffect(() => {
    setInput(username);
  }, [username]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMobileAccordionValue([]);
  }, [location.pathname]);

  const focusInputById = useCallback((inputId: string, attempt = 0) => {
    const usernameInput = document.getElementById(
      inputId,
    ) as HTMLInputElement | null;
    if (usernameInput) {
      usernameInput.focus();
      usernameInput.select?.();
      return;
    }
    if (attempt >= 8) return;
    window.setTimeout(() => focusInputById(inputId, attempt + 1), 60);
  }, []);

  useEffect(() => {
    const handleOpenNavUsernameInput = () => {
      if (hideInput) return;

      const isCompactViewport = window.matchMedia(
        "(max-width: 1023px)",
      ).matches;
      if (!isCompactViewport) {
        focusInputById("username-input");
        return;
      }

      setIsMobileMenuOpen(true);
      setMobileAccordionValue((prev) =>
        prev.includes(MOBILE_FETCH_USER_SECTION)
          ? prev
          : [...prev, MOBILE_FETCH_USER_SECTION],
      );

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          focusInputById("username-input-mobile");
        });
      });
    };

    window.addEventListener(
      OPEN_NAV_USERNAME_EVENT,
      handleOpenNavUsernameInput,
    );
    return () => {
      window.removeEventListener(
        OPEN_NAV_USERNAME_EVENT,
        handleOpenNavUsernameInput,
      );
    };
  }, [focusInputById, hideInput]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) {
      setUserError(LOGIN_REQUIRED_MESSAGE);
      return;
    }
    const didLookup = await lookupPlayer(input);
    if (didLookup) setIsMobileMenuOpen(false);
  };

  const handleUsernameInputInteraction = () => {
    if (!session) {
      setUserError(LOGIN_REQUIRED_MESSAGE);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-surface-panel-elevated p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <Link to="/" aria-label="RSMethods home" className="flex items-center">
          <span className="flex items-baseline gap-2">
            <span className="text-xl font-bold">
              <span className="text-brand ">RSM</span>
              <span className="text-black dark:text-white">ethods</span>
            </span>
            {runtimeEnvironmentLabel ? (
              <span className="text-sm font-semibold text-muted-foreground">
                ({runtimeEnvironmentLabel})
              </span>
            ) : null}
          </span>
        </Link>

        <NavigationMenu viewport={false} className="hidden lg:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger onClick={() => navigate("/allMethods")}>
                Money making methods
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid gap-2 p-2 md:w-[420px]">
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-6 no-underline outline-hidden select-none focus:shadow-md"
                        to="/allMethods"
                      >
                        <div className="mt-4 mb-2 text-lg font-medium">
                          All methods
                        </div>
                        <p className="text-muted-foreground text-sm leading-tight">
                          All official money making methods in one place.
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger onClick={() => navigate("/skilling")}>
                Training methods
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid gap-2 p-2 md:w-[420px]">
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-6 no-underline outline-hidden select-none focus:shadow-md"
                        to="/skilling"
                      >
                        <div className="mt-4 mb-2 text-lg font-medium">
                          See all skills
                        </div>
                        <p className="text-muted-foreground text-sm leading-tight">
                          Browse every official training skill in one place.
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <ul className={SKILL_COLUMNS_GRID_CLASS}>
                      {SKILL_TAB_COLUMNS.map((skills, columnIndex) => (
                        <li key={columnIndex}>
                          <ul className={SKILL_TILE_GRID_CLASS}>
                            {skills.map((skill) => {
                              const iconUrl = getUrlByType(skill);
                              const skillName = formatSkillName(skill);
                              const unavailable = isSkillUnavailable(skill);

                              return (
                                <li key={skill}>
                                  {unavailable ? (
                                    <span
                                      aria-label={`${skillName}: No variants added yet`}
                                      aria-disabled="true"
                                      title="No variants added yet"
                                      className={UNAVAILABLE_SKILL_TILE_CLASS}
                                    >
                                      {iconUrl ? (
                                        <img
                                          src={iconUrl}
                                          alt={`${skill}_icon`}
                                          className="block shrink-0 object-contain grayscale [image-rendering:pixelated]"
                                        />
                                      ) : null}
                                      <span>{skillName}</span>
                                    </span>
                                  ) : (
                                    <NavigationMenuLink asChild>
                                      <Link
                                        aria-label={skillName}
                                        title={skillName}
                                        className={SKILL_TILE_CLASS}
                                        to={`/skilling/${skill}`}
                                      >
                                        {iconUrl ? (
                                          <img
                                            src={iconUrl}
                                            alt={`${skill}_icon`}
                                            className="block shrink-0 object-contain [image-rendering:pixelated]"
                                          />
                                        ) : null}
                                        <span>{skillName}</span>
                                      </Link>
                                    </NavigationMenuLink>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  to="/roadmaps"
                  className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Roadmaps
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  to="/wiki"
                  className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Wiki
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  to="/feedback"
                  className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Feedback
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            {isSuperAdmin ? (
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    to="/admin"
                    className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Admin
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ) : null}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2 lg:gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="outline"
                size="icon"
                className="hidden sm:inline-flex"
              >
                <a
                  href={OFFICIAL_DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join our Discord!"
                >
                  <IconBrandDiscord aria-hidden="true" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Join our Discord!</TooltipContent>
          </Tooltip>

          <ThemeToggle labelClassName="hidden xl:inline" />

          {!hideInput && (
            <div className="hidden flex-col gap-1 lg:flex">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  type="text"
                  id="username-input"
                  placeholder="Enter username"
                  maxLength={USERNAME_MAX_LENGTH}
                  value={input}
                  readOnly={!session}
                  onClick={handleUsernameInputInteraction}
                  onFocus={handleUsernameInputInteraction}
                  onChange={(e) => {
                    if (!session) return;
                    setInput(
                      normalizeBoundedText(e.target.value, USERNAME_MAX_LENGTH),
                    );
                  }}
                />
                <LookupButton
                  isPending={isPlayerLookupPending}
                  cooldownRemaining={manualLookupCooldownRemaining}
                />
              </form>
              {userError && (
                <div className="text-sm text-destructive">
                  <UsernameLookupErrorMessage
                    message={userError}
                    helperClassName="text-[13px] leading-[18px] text-destructive/85"
                  />
                </div>
              )}
            </div>
          )}

          {session ? (
            <Link
              to="/account"
              aria-label="Account"
              className="rounded-full outline-hidden transition-opacity duration-200 hover:opacity-85 focus-visible:ring-2"
            >
              <Avatar className="h-9 w-9 border">
                <AvatarImage src={avatarUrl} alt="Account avatar" />
                <AvatarFallback className="text-xs font-semibold">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Button asChild variant="outline">
              <Link to="/login">Login</Link>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <span className="relative block size-4">
              <Menu
                className={cn(
                  "absolute inset-0 size-4 transition-all duration-200",
                  isMobileMenuOpen
                    ? "rotate-90 scale-0 opacity-0"
                    : "rotate-0 scale-100 opacity-100",
                )}
              />
              <X
                className={cn(
                  "absolute inset-0 size-4 transition-all duration-200",
                  isMobileMenuOpen
                    ? "rotate-0 scale-100 opacity-100"
                    : "-rotate-90 scale-0 opacity-0",
                )}
              />
            </span>
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out lg:hidden",
          isMobileMenuOpen
            ? "mt-4 max-h-[80vh] opacity-100"
            : "pointer-events-none mt-0 max-h-0 opacity-0",
        )}
      >
        <div className="rounded-2xl bg-surface-panel-subtle/90 p-2 shadow-sm ring-1 ring-border/80 backdrop-blur">
          <Accordion
            type="multiple"
            className="w-full space-y-2"
            value={mobileAccordionValue}
            onValueChange={setMobileAccordionValue}
          >
            <AccordionItem
              value="mobile-money-methods"
              className="overflow-hidden rounded-xl border-none bg-surface-panel-elevated"
            >
              <AccordionTrigger className="rounded-xl px-3 py-3 text-sm font-semibold hover:no-underline">
                Money making methods
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <ul className="grid gap-2">
                  <li>
                    <Link
                      className="from-muted/50 to-muted hover:bg-accent/70 focus:bg-accent/70 flex h-full w-full flex-col justify-end rounded-lg bg-linear-to-b p-4 text-sm no-underline outline-hidden transition-colors duration-200"
                      to="/allMethods"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="mb-1 text-base font-medium">
                        All methods
                      </div>
                      <p className="text-muted-foreground leading-tight">
                        All official money making methods in one place.
                      </p>
                    </Link>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="mobile-training-methods"
              className="overflow-hidden rounded-xl border-none bg-surface-panel-elevated"
            >
              <AccordionTrigger className="rounded-xl px-3 py-3 text-sm font-semibold hover:no-underline">
                Training methods
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <div className="grid gap-2">
                  <Link
                    className={MOBILE_SKILL_OVERVIEW_LINK_CLASS}
                    to="/skilling"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    See all skills
                  </Link>
                  <ul className={SKILL_TILE_GRID_CLASS}>
                    {SKILL_TAB_ORDER.map((skill) => {
                      const iconUrl = getUrlByType(skill);
                      const skillName = formatSkillName(skill);
                      const unavailable = isSkillUnavailable(skill);

                      return (
                        <li key={skill}>
                          {unavailable ? (
                            <span
                              aria-label={`${skillName}: No variants added yet`}
                              aria-disabled="true"
                              title="No variants added yet"
                              className={UNAVAILABLE_SKILL_TILE_CLASS}
                            >
                              {iconUrl ? (
                                <img
                                  src={iconUrl}
                                  alt={`${skill}_icon`}
                                  className="block shrink-0 object-contain grayscale [image-rendering:pixelated]"
                                />
                              ) : null}
                              <span>{skillName}</span>
                            </span>
                          ) : (
                            <Link
                              aria-label={skillName}
                              title={skillName}
                              className={SKILL_TILE_CLASS}
                              to={`/skilling/${skill}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {iconUrl ? (
                                <img
                                  src={iconUrl}
                                  alt={`${skill}_icon`}
                                  className="block shrink-0 object-contain [image-rendering:pixelated]"
                                />
                              ) : null}
                              <span>{skillName}</span>
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {!hideInput && (
              <AccordionItem
                value={MOBILE_FETCH_USER_SECTION}
                className="overflow-hidden rounded-xl border-none bg-surface-panel-elevated"
              >
                <AccordionTrigger className="rounded-xl px-3 py-3 text-sm font-semibold hover:no-underline">
                  Fetch by username
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="flex flex-col gap-1">
                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-2 sm:flex-row"
                    >
                      <Input
                        type="text"
                        id="username-input-mobile"
                        placeholder="Enter username"
                        maxLength={USERNAME_MAX_LENGTH}
                        value={input}
                        readOnly={!session}
                        onClick={handleUsernameInputInteraction}
                        onFocus={handleUsernameInputInteraction}
                        onChange={(e) => {
                          if (!session) return;
                          setInput(
                            normalizeBoundedText(
                              e.target.value,
                              USERNAME_MAX_LENGTH,
                            ),
                          );
                        }}
                      />
                      <LookupButton
                        isPending={isPlayerLookupPending}
                        cooldownRemaining={manualLookupCooldownRemaining}
                      />
                    </form>
                    {userError && (
                      <div className="text-sm text-destructive">
                        <UsernameLookupErrorMessage
                          message={userError}
                          helperClassName="text-[13px] leading-[18px] text-destructive/85"
                        />
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          <Link
            to="/roadmaps"
            className="hover:bg-accent/70 focus:bg-accent/70 mt-2 flex w-full items-center rounded-xl bg-surface-panel-elevated px-3 py-3 text-sm font-semibold no-underline outline-hidden transition-colors duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Roadmaps
          </Link>

          <Link
            to="/wiki"
            className="hover:bg-accent/70 focus:bg-accent/70 mt-2 flex w-full items-center rounded-xl bg-surface-panel-elevated px-3 py-3 text-sm font-semibold no-underline outline-hidden transition-colors duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Wiki
          </Link>

          <Link
            to="/feedback"
            className="hover:bg-accent/70 focus:bg-accent/70 mt-2 flex w-full items-center rounded-xl bg-surface-panel-elevated px-3 py-3 text-sm font-semibold no-underline outline-hidden transition-colors duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Feedback
          </Link>

          {isSuperAdmin ? (
            <Link
              to="/admin"
              className="hover:bg-accent/70 focus:bg-accent/70 mt-2 flex w-full items-center rounded-xl bg-surface-panel-elevated px-3 py-3 text-sm font-semibold no-underline outline-hidden transition-colors duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Admin
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

function LookupButton({
  isPending,
  cooldownRemaining,
}: {
  isPending: boolean;
  cooldownRemaining: number;
}) {
  const isCoolingDown = cooldownRemaining > 0;
  const disabled = isPending || isCoolingDown;
  const tooltip = `You can fetch or refresh OSRS player data once per minute. Try again in ${Math.ceil(cooldownRemaining / 1000)} seconds.`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button type="submit" disabled={disabled}>
            {isPending ? "Fetching..." : "Fetch"}
          </Button>
        </span>
      </TooltipTrigger>
      {isCoolingDown ? <TooltipContent>{tooltip}</TooltipContent> : null}
    </Tooltip>
  );
}
