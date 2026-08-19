import { Link } from "react-router-dom";
import {
  FOOTER_AFFILIATION_NOTICE,
  PROJECT_CONTACT_EMAIL,
  PROJECT_CONTACT_MAILTO,
} from "@/lib/legalNotice";

const navigationLinks = [
  { label: "All Methods", to: "/allMethods" },
  { label: "Training Methods", to: "/skilling" },
  { label: "Wiki", to: "/wiki" },
  { label: "Changelog", to: "/changelog" },
] as const;

const legalLinks = [
  { label: "Privacy policy", to: "/privacy-policy" },
  { label: "Terms of Use", to: "/terms-of-use" },
  { label: "Cookies and local storage", to: "/cookies-and-local-storage" },
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
              Legal
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {legalLinks.map((link) => (
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
              Contact
            </h2>

            <a
              className="mt-2 inline-block text-sm text-muted-foreground hover:text-foreground"
              href={PROJECT_CONTACT_MAILTO}
            >
              {PROJECT_CONTACT_EMAIL}
            </a>
          </section>
        </div>

        <div className="mt-10 border-t border-border/70 pt-5 text-xs text-muted-foreground">
          <p className="max-w-3xl leading-relaxed">
            {FOOTER_AFFILIATION_NOTICE}
          </p>
          <p className="mt-2">
            Copyright {year} RSMethods. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
