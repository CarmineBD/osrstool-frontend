import { Link } from "react-router-dom";

const navigationLinks = [
  { label: "All Methods", to: "/allMethods" },
  { label: "Training Methods", to: "/skilling" },
  { label: "Roadmaps", to: "/roadmaps" },
  { label: "Wiki", to: "/wiki" },
  { label: "Account", to: "/account" },
] as const;

const resourceLinks = [
  { label: "Status" },
  { label: "API docs" },
] as const;

const communityLinks = [
  { label: "Discord" },
  { label: "X / Twitter" },
  { label: "Reddit" },
] as const;

const legalLinks = [
  { label: "Privacy policy", to: "/privacy-policy" },
  { label: "Terms of service" },
  { label: "Cookies and local storage", to: "/cookies-and-local-storage" },
] as const;

function ComingSoonLink({ label }: { label: string }) {
  return (
    <span
      aria-disabled="true"
      className="cursor-not-allowed text-muted-foreground/70"
      title="Coming soon"
    >
      {label} <span className="text-xs">(soon)</span>
    </span>
  );
}

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
                alt="RSMethods logo"
                className="h-7 w-auto"
              />
              <span className="text-lg font-semibold tracking-tight">
                <span className="text-brand">RSM</span>
                <span className="text-black dark:text-white">ethods</span>
              </span>
            </Link>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Practical OSRS tools for money making, skilling, and community
              knowledge.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Contact options are coming soon.
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
                <li key={link.label}>
                  <ComingSoonLink label={link.label} />
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
                <li key={link.label}>
                  <ComingSoonLink label={link.label} />
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border/70 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {year} RSMethods. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            {legalLinks.map((link) => (
              "to" in link ? (
                <Link
                  key={link.to}
                  to={link.to}
                  className="hover:text-foreground"
                >
                  {link.label}
                </Link>
              ) : (
                <ComingSoonLink key={link.label} label={link.label} />
              )
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
