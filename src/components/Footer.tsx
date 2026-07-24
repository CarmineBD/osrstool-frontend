import { Link } from "react-router-dom";

const navigationLinks = [
  { label: "All Methods", to: "/allMethods" },
  { label: "Training Methods", to: "/skilling" },
  { label: "Wiki", to: "/wiki" },
  { label: "Account", to: "/account" },
] as const;

const resourceLinks = [
  { label: "Roadmap", href: "https://example.com/roadmap" },
  { label: "Status", href: "https://status.example.com" },
  { label: "API docs", href: "https://docs.example.com" },
] as const;

const communityLinks = [
  { label: "Discord", href: "https://discord.gg/TODO" },
  { label: "X / Twitter", href: "https://x.com/TODO" },
  { label: "Reddit", href: "https://reddit.com/r/TODO" },
] as const;

const legalLinks = [
  { label: "Privacy policy", href: "https://example.com/privacy" },
  { label: "Terms of service", href: "https://example.com/terms" },
  { label: "Cookie policy", href: "https://example.com/cookies" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-5">
          <section className="xl:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2">
              <img
                src="https://oldschool.runescape.wiki/images/thumb/Coins_detail.png/120px-Coins_detail.png?404bc"
                alt="GP Now logo"
                className="h-7 w-auto"
              />
              <span className="text-lg font-semibold tracking-tight">GP Now</span>
            </Link>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Practical OSRS tools for money making, skilling, and community
              knowledge.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Contact:{" "}
              <a
                href="mailto:contact@example.com"
                className="underline-offset-4 hover:underline"
              >
                contact@example.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/90">
              Navigation
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {navigationLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/90">
              Resources
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/90">
              Community
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {communityLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border/70 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {year} GP Now. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            {legalLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
