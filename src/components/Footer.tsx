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
  { label: "Feedback", to: "/feedback" },
] as const;

const legalLinks = [
  { label: "Privacy policy", to: "/privacy-policy" },
  { label: "Terms of Use", to: "/terms-of-use" },
  { label: "Cookies and local storage", to: "/cookies-and-local-storage" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-border/70 bg-surface-panel">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-8">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-5">
          <section className="xl:col-span-2">
            <Link to="/" className="inline-flex">
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
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/90">
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
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/90">
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
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/90">
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

        <div className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
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
