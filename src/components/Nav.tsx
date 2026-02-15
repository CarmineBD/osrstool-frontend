import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
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

export type Props = { hideInput?: boolean };
const LOGIN_REQUIRED_MESSAGE = "sign-in/login to fetch data by osrs usernames";

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Alert Dialog",
    href: "/docs/primitives/alert-dialog",
    description:
      "A modal dialog that interrupts the user with important content and expects a response.",
  },
  {
    title: "Hover Card",
    href: "/docs/primitives/hover-card",
    description: "For sighted users to preview content available behind a link.",
  },
  {
    title: "Progress",
    href: "/docs/primitives/progress",
    description:
      "Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.",
  },
  {
    title: "Scroll-area",
    href: "/docs/primitives/scroll-area",
    description: "Visually or semantically separates content.",
  },
  {
    title: "Tabs",
    href: "/docs/primitives/tabs",
    description:
      "A set of layered sections of content known as tab panels that are displayed one at a time.",
  },
  {
    title: "Tooltip",
    href: "/docs/primitives/tooltip",
    description:
      "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
  },
];

export function Nav({ hideInput }: Props) {
  const { username, setUsername, clearUsername, userError, setUserError } = useUsername();
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
            <NavigationMenuTrigger>Money making methods</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                <li className="row-span-3">
                  <NavigationMenuLink asChild>
                    <Link
                      className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-6 no-underline outline-hidden select-none focus:shadow-md"
                      to="/"
                    >
                      <div className="mt-4 mb-2 text-lg font-medium">
                        All methods
                      </div>
                      <p className="text-muted-foreground text-sm leading-tight">
                        All official money making methods.
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
        {logoutError && <p className="text-sm text-destructive">{logoutError}</p>}
      </div>
    </nav>
  );
}

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link to={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}
