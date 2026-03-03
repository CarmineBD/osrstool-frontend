import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUsername } from "@/contexts/UsernameContext";
import { useAuth } from "@/auth/AuthProvider";
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

export function Nav({ hideInput }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, setUsername, userError, setUserError } = useUsername();
  const { session } = useAuth();
  const [input, setInput] = useState<string>(username);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileAccordionValue, setMobileAccordionValue] = useState<string[]>([]);
  const avatarUrl =
    typeof session?.user?.user_metadata?.avatar_url === "string"
      ? session.user.user_metadata.avatar_url
      : undefined;
  const avatarFallback =
    (session?.user?.email ?? "A").trim().charAt(0).toUpperCase() || "A";

  useEffect(() => {
    setInput(username);
  }, [username]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMobileAccordionValue([]);
  }, [location.pathname]);

  const focusInputById = useCallback((inputId: string, attempt = 0) => {
    const usernameInput = document.getElementById(inputId) as HTMLInputElement | null;
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

      const isCompactViewport = window.matchMedia("(max-width: 1023px)").matches;
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

    window.addEventListener(OPEN_NAV_USERNAME_EVENT, handleOpenNavUsernameInput);
    return () => {
      window.removeEventListener(OPEN_NAV_USERNAME_EVENT, handleOpenNavUsernameInput);
    };
  }, [focusInputById, hideInput]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!session) {
      setUserError(LOGIN_REQUIRED_MESSAGE);
      return;
    }
    setUserError(null);
    setUsername(input.trim());
    setIsMobileMenuOpen(false);
  };

  const handleUsernameInputInteraction = () => {
    if (!session) {
      setUserError(LOGIN_REQUIRED_MESSAGE);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white p-4 shadow">
      <div className="flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center space-x-2">
          <img
            src="https://oldschool.runescape.wiki/images/thumb/Coins_detail.png/120px-Coins_detail.png?404bc"
            alt="Logo"
            className="h-8 w-auto"
          />
          <span className="text-xl font-bold">GP Now</span>
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
              <NavigationMenuTrigger onClick={() => navigate("/allMethods")}>
                Training methods
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-fit grid-cols-[max-content_max-content_max-content] justify-items-center gap-x-2 gap-y-1 p-1">
                  <li className="col-span-3">
                    <NavigationMenuLink asChild>
                      <Link
                        className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-2 no-underline outline-hidden select-none focus:shadow-md"
                        to="/skilling"
                      >
                        <div className="text-base font-medium">
                          Se all skills
                        </div>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  {SKILL_TAB_ORDER.map((skill) => {
                    const iconUrl = getUrlByType(skill);
                    const skillName = formatSkillName(skill);

                    return (
                      <li key={skill}>
                        <NavigationMenuLink asChild>
                          <Link
                            className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-center justify-center gap-1 rounded-md px-1 py-1 text-xs no-underline outline-hidden transition-colors select-none"
                            to={`/skilling/${skill}`}
                          >
                            {iconUrl ? (
                              <img
                                src={iconUrl}
                                alt={`${skill}_icon`}
                                className="block shrink-0 [image-rendering:pixelated]"
                              />
                            ) : null}
                            <span className="font-medium leading-none">
                              {skillName}
                            </span>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    );
                  })}
                </ul>
              </NavigationMenuContent>
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
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2 lg:gap-4">
          {!hideInput && (
            <div className="hidden flex-col gap-1 lg:flex">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  type="text"
                  id="username-input"
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
              </form>
              {userError && <p className="text-sm text-red-500">{userError}</p>}
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
            aria-label={isMobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <span className="relative block size-4">
              <Menu
                className={cn(
                  "absolute inset-0 size-4 transition-all duration-200",
                  isMobileMenuOpen
                    ? "rotate-90 scale-0 opacity-0"
                    : "rotate-0 scale-100 opacity-100"
                )}
              />
              <X
                className={cn(
                  "absolute inset-0 size-4 transition-all duration-200",
                  isMobileMenuOpen
                    ? "rotate-0 scale-100 opacity-100"
                    : "-rotate-90 scale-0 opacity-0"
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
            : "pointer-events-none mt-0 max-h-0 opacity-0"
        )}
      >
        <div className="rounded-2xl bg-slate-50/90 p-2 shadow-sm ring-1 ring-slate-200/80 backdrop-blur">
          <Accordion
            type="multiple"
            className="w-full space-y-2"
            value={mobileAccordionValue}
            onValueChange={setMobileAccordionValue}
          >
            <AccordionItem
              value="mobile-money-methods"
              className="overflow-hidden rounded-xl border-none bg-white/90"
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
                      <div className="mb-1 text-base font-medium">All methods</div>
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
              className="overflow-hidden rounded-xl border-none bg-white/90"
            >
              <AccordionTrigger className="rounded-xl px-3 py-3 text-sm font-semibold hover:no-underline">
                Training methods
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <div className="grid gap-2">
                  <Link
                    className="from-muted/50 to-muted hover:bg-accent/70 focus:bg-accent/70 rounded-lg bg-linear-to-b p-3 text-sm font-medium no-underline outline-hidden transition-colors duration-200"
                    to="/skilling"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    See all skills
                  </Link>
                  <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                    {SKILL_TAB_ORDER.map((skill) => {
                      const iconUrl = getUrlByType(skill);
                      const skillName = formatSkillName(skill);

                      return (
                        <li key={skill}>
                          <Link
                            className="hover:bg-accent/70 focus:bg-accent/70 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs no-underline outline-hidden transition-colors duration-200"
                            to={`/skilling/${skill}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {iconUrl ? (
                              <img
                                src={iconUrl}
                                alt={`${skill}_icon`}
                                className="block shrink-0 [image-rendering:pixelated]"
                              />
                            ) : null}
                            <span className="font-medium">{skillName}</span>
                          </Link>
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
                className="overflow-hidden rounded-xl border-none bg-white/90"
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
                    </form>
                    {userError && <p className="text-sm text-red-500">{userError}</p>}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          <Link
            to="/wiki"
            className="hover:bg-accent/70 focus:bg-accent/70 mt-2 flex w-full items-center rounded-xl bg-white/90 px-3 py-3 text-sm font-semibold no-underline outline-hidden transition-colors duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Wiki
          </Link>
        </div>
      </div>
    </nav>
  );
}
