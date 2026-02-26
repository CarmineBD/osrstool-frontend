import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { getUrlByType } from "@/lib/utils";

export type Props = { hideInput?: boolean };
const LOGIN_REQUIRED_MESSAGE = "sign-in/login to fetch data by osrs usernames";
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
  const { username, setUsername, clearUsername, userError, setUserError } =
    useUsername();
  const { session, signOut } = useAuth();
  const [input, setInput] = useState<string>(username);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    setInput(username);
  }, [username]);

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

  const handleLogout = async () => {
    setLogoutError(null);
    const error = await signOut();
    if (error) {
      setLogoutError(error);
      return;
    }
    clearUsername();
  };

  return (
    <nav className="flex items-center justify-between bg-white p-4 shadow z-10">
      <Link to="/" className="flex items-center space-x-2">
        <img
          src="https://oldschool.runescape.wiki/images/thumb/Coins_detail.png/120px-Coins_detail.png?404bc"
          alt="Logo"
          className="h-8 w-auto"
        />
        <span className="text-xl font-bold">GP Now</span>
      </Link>

      <NavigationMenu viewport={false}>
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
                {/* <ListItem href="/docs" title="Hottest">
                  Money making methods that are trending now.
                </ListItem>
                <ListItem href="/docs/installation" title="Most favourited">
                  Money making methods that have been favourited the most by
                  users.
                </ListItem>
                <ListItem
                  href="/docs/primitives/typography"
                  title="Community Money Making Methods"
                >
                  Money making methods submitted by the community.
                </ListItem> */}
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
                      <div className="text-base font-medium">Se all skills</div>
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
                to="/wiki/technical"
                className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Technical wiki
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

          {/* <NavigationMenuItem>
            <NavigationMenuTrigger>Training methods</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                {components.map((component) => (
                  <ListItem
                    key={component.title}
                    title={component.title}
                    href={component.href}
                  >
                    {component.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem> */}

          {/* <NavigationMenuItem>
            <NavigationMenuTrigger>Calculators</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[300px] gap-4">
                <li>
                  <NavigationMenuLink asChild>
                    <Link to="#">
                      <div className="font-medium">Skilkling Calculators</div>
                      <div className="text-muted-foreground">
                        Focused on terms of skilling
                      </div>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <Link to="#">
                      <div className="font-medium">
                        Money making calculators
                      </div>
                      <div className="text-muted-foreground">
                        Focused on making money
                      </div>
                    </Link>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem> */}

          {/* <NavigationMenuItem>
            <NavigationMenuTrigger>Useful tables</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[300px] gap-4">
                <li>
                  <NavigationMenuLink asChild>
                    <Link to="#">
                      <div className="font-medium">Components</div>
                      <div className="text-muted-foreground">
                        Browse all components in the library.
                      </div>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <Link to="#">
                      <div className="font-medium">Documentation</div>
                      <div className="text-muted-foreground">
                        Learn how to use the library.
                      </div>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <Link to="#">
                      <div className="font-medium">Blog</div>
                      <div className="text-muted-foreground">
                        Read our latest blog posts.
                      </div>
                    </Link>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem> */}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="flex items-center gap-4">
        {!hideInput && (
          <div className="flex flex-col gap-1">
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
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/account">Account</Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        ) : (
          <Button asChild variant="outline">
            <Link to="/login">Login</Link>
          </Button>
        )}
        {logoutError && (
          <p className="text-sm text-destructive">{logoutError}</p>
        )}
      </div>
    </nav>
  );
}
