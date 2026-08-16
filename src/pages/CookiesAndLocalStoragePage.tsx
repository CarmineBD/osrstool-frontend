import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  PUBLIC_BODY_CLASS,
  PUBLIC_ELEVATED_PANEL_CLASS,
  PUBLIC_HIGHLIGHT_CLASS,
  PUBLIC_LINK_CLASS,
  PUBLIC_PANEL_CLASS,
  PUBLIC_SECTION_EYEBROW_CLASS,
  PUBLIC_SUBPANEL_CLASS,
  PUBLIC_TITLE_CLASS,
} from "@/components/public-page/publicPageStyles";
import { useSeo } from "@/hooks/useSeo";

const SEO_TITLE = "Cookies and Local Storage | RSMethods";
const SEO_DESCRIPTION =
  "A frontend audit of cookies, local storage, session storage, authentication storage, and other browser-side storage used by RSMethods.";
const LAST_UPDATED = "August 16, 2026";

type StorageRow = {
  item: string;
  technology: string;
  purpose: string;
  provider: string;
  duration: string;
  strictlyNecessary: "Yes" | "No";
};

const storageRows: readonly StorageRow[] = [
  {
    item: "rsmethods-theme",
    technology: "localStorage",
    purpose:
      "Stores the selected light or dark theme so the same appearance can be restored on the next visit. The older osrstool-theme key is read only as a migration fallback.",
    provider: "RSMethods",
    duration: "Until you change the theme or clear browser storage.",
    strictlyNecessary: "No",
  },
  {
    item: "username",
    technology: "localStorage",
    purpose:
      "Stores the OSRS username you enter so filters and roadmap-related flows can reuse it without asking again. It is removed when the signed-out state is detected or when you clear it.",
    provider: "RSMethods",
    duration: "Until it is replaced, cleared, or removed after sign-out handling.",
    strictlyNecessary: "No",
  },
  {
    item: "sb-<supabase-project-ref>-auth-token",
    technology: "localStorage",
    purpose:
      "Supabase Auth persists the signed-in session, including access and refresh tokens plus session metadata, so authenticated features continue working across reloads.",
    provider: "Supabase Auth on behalf of RSMethods",
    duration:
      "Until you sign out, the session is replaced, the refresh window expires, or browser storage is cleared.",
    strictlyNecessary: "Yes",
  },
  {
    item: "rsmethods-recovery-mode",
    technology: "sessionStorage",
    purpose:
      "Marks the current tab as being in password recovery mode so the reset flow can continue safely after the auth callback. The older gp-now-recovery-mode key is read only for backward compatibility.",
    provider: "RSMethods",
    duration: "Current browser tab or until recovery completes and the flag is cleared.",
    strictlyNecessary: "Yes",
  },
  {
    item: "rsmethods-pending-auth-redirect",
    technology: "sessionStorage",
    purpose:
      "Stores the in-app path to return to after a login flow. The older gp-now-pending-auth-redirect key is read only for backward compatibility.",
    provider: "RSMethods",
    duration:
      "Current browser tab and normally cleared immediately after the redirect is consumed.",
    strictlyNecessary: "Yes",
  },
  {
    item: "rsmethods:methods-table-columns:<user-id>:default|skill",
    technology: "sessionStorage",
    purpose:
      "Stores signed-in table column visibility and ordering for the current tab. Older `osrstool:methods-table-columns:...` keys are removed when the new value is saved.",
    provider: "RSMethods",
    duration: "Current browser tab or until the table preferences are reset.",
    strictlyNecessary: "No",
  },
] as const;

const noCookieItems = [
  "RSMethods does not currently set first-party cookies from its own frontend code.",
  "No IndexedDB database is opened by the current frontend.",
  "No service worker, Cache Storage, advertising pixel, session replay SDK, or analytics SDK is initialized on page load.",
] as const;

const externalNotes = [
  "If you choose Google sign-in, Google and Supabase may use their own cookies on their own domains to complete that authentication flow. Those provider cookies are outside the RSMethods frontend codebase and are only involved when you start that sign-in process.",
  "Anonymous live-presence counting uses an in-memory visitor ID created for the active browser context. It is not written to cookies, localStorage, sessionStorage, or IndexedDB and resets when the page context is replaced.",
  "A legacy localStorage key named osrs-tool-presence-visitor-id is only removed if found. It is not reused for current tracking or persistence.",
] as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`${PUBLIC_SUBPANEL_CLASS} p-6`}>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className={`mt-3 space-y-3 ${PUBLIC_BODY_CLASS}`}>{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function CookiesAndLocalStoragePage() {
  useSeo({
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    path: "/cookies-and-local-storage",
  });

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className={`${PUBLIC_PANEL_CLASS} p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={PUBLIC_SECTION_EYEBROW_CLASS}>Legal</p>
            <h1 className={PUBLIC_TITLE_CLASS}>Cookies and Local Storage</h1>
            <p className={`mt-2 max-w-3xl ${PUBLIC_BODY_CLASS}`}>
              This page lists the browser-side storage currently used by the
              RSMethods frontend, why each item exists, who provides it, how
              long it usually remains, and whether it is strictly necessary.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>

        <div className={`${PUBLIC_HIGHLIGHT_CLASS} mt-6 rounded-xl p-5`}>
          <p className="text-sm font-semibold text-foreground">
            Current status: no analytics, advertising, or non-essential
            tracking scripts are automatically activated by this frontend.
          </p>
          <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
            Because the current build uses only authentication, security,
            session, and first-party functional preference storage, this change
            does not add a consent banner.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <Section title="Detected Storage">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-border/70 text-left">
                <thead className="bg-surface-panel-elevated">
                  <tr>
                    <th className="border-b border-border/70 px-4 py-3 text-sm font-semibold text-foreground">
                      Item
                    </th>
                    <th className="border-b border-border/70 px-4 py-3 text-sm font-semibold text-foreground">
                      Technology
                    </th>
                    <th className="border-b border-border/70 px-4 py-3 text-sm font-semibold text-foreground">
                      Purpose
                    </th>
                    <th className="border-b border-border/70 px-4 py-3 text-sm font-semibold text-foreground">
                      Provider
                    </th>
                    <th className="border-b border-border/70 px-4 py-3 text-sm font-semibold text-foreground">
                      Approximate duration
                    </th>
                    <th className="border-b border-border/70 px-4 py-3 text-sm font-semibold text-foreground">
                      Strictly necessary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {storageRows.map((row, index) => (
                    <tr
                      key={row.item}
                      className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="align-top border-b border-border/60 px-4 py-4 text-sm font-semibold text-foreground">
                        <code>{row.item}</code>
                      </td>
                      <td className="align-top border-b border-border/60 px-4 py-4 text-sm text-muted-foreground">
                        {row.technology}
                      </td>
                      <td className="align-top border-b border-border/60 px-4 py-4 text-sm text-muted-foreground">
                        {row.purpose}
                      </td>
                      <td className="align-top border-b border-border/60 px-4 py-4 text-sm text-muted-foreground">
                        {row.provider}
                      </td>
                      <td className="align-top border-b border-border/60 px-4 py-4 text-sm text-muted-foreground">
                        {row.duration}
                      </td>
                      <td className="align-top border-b border-border/60 px-4 py-4 text-sm font-medium text-foreground">
                        {row.strictlyNecessary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Cookies, IndexedDB, and Tracking">
            <BulletList items={noCookieItems} />
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={`${PUBLIC_ELEVATED_PANEL_CLASS} p-6`}>
              <h2 className="text-lg font-bold text-foreground">
                External provider notes
              </h2>
              <div className={`mt-3 space-y-3 ${PUBLIC_BODY_CLASS}`}>
                <BulletList items={externalNotes} />
              </div>
            </section>

            <section className={`${PUBLIC_ELEVATED_PANEL_CLASS} p-6`}>
              <h2 className="text-lg font-bold text-foreground">
                If analytics or advertising is added later
              </h2>
              <div className={`mt-3 space-y-3 ${PUBLIC_BODY_CLASS}`}>
                <p>
                  The current frontend does not load analytics, advertising, or
                  cross-site tracking tools automatically.
                </p>
                <p>
                  If that changes, those scripts or storage keys should not be
                  activated by default. They would need prior consent where the
                  law requires it, plus updated documentation on this page and
                  in the privacy materials.
                </p>
              </div>
            </section>
          </div>

          <Section title="Related Privacy Information">
            <p>
              For broader information about account data, provider roles, data
              retention, and contact details, see the{" "}
              <Link className={PUBLIC_LINK_CLASS} to="/privacy-policy">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          <Section title="Last Updated">
            <p>{LAST_UPDATED}</p>
          </Section>
        </div>
      </div>
    </section>
  );
}

export default CookiesAndLocalStoragePage;
