import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  PUBLIC_BODY_CLASS,
  PUBLIC_HIGHLIGHT_CLASS,
  PUBLIC_LINK_CLASS,
  PUBLIC_PANEL_CLASS,
  PUBLIC_SECTION_EYEBROW_CLASS,
  PUBLIC_SUBPANEL_CLASS,
  PUBLIC_TITLE_CLASS,
} from "@/components/public-page/publicPageStyles";
import { useSeo } from "@/hooks/useSeo";

const SEO_TITLE = "Privacy Policy | RSMethods";
const SEO_DESCRIPTION =
  "Privacy Policy for RSMethods, including authentication, account data, OSRS player lookups, browser storage, providers, retention, security, and user rights.";
const LAST_UPDATED = "August 15, 2026";

const dataCategories = [
  "Account and authentication data, including your Supabase user ID, email address, session or access tokens used to authenticate requests to the backend, and profile metadata such as an avatar URL when supplied by your authentication provider.",
  "RSMethods account data, including your account username, role, plan, and account creation and update timestamps.",
  "OSRS-related data you choose to provide, including your OSRS username and the public character data requested to support filters and roadmaps.",
  "Feature usage data, including likes connected to your authenticated account and removable by unliking.",
  "Browser-stored preferences and temporary session data used for theme, OSRS username, account recovery or redirect flows, and signed-in table preferences.",
  "Technical and presence data, including online-presence heartbeats, online counts, aggregated presence history, endpoint usage logs, response status, and processing time.",
] as const;

const purposeRows = [
  {
    title: "Accounts, login, and account features",
    description:
      "We process account and authentication data to let you create an account, sign in, recover access, authenticate backend requests, manage your account, and use signed-in features.",
    legalBasis: "Legal basis: performance of the service you request.",
  },
  {
    title: "Likes, preferences, and roadmap features",
    description:
      "We process account, preference, and OSRS-related data to remember your settings, show liked items, and provide OSRS filters and roadmap features that depend on the data you choose to submit.",
    legalBasis: "Legal basis: performance of the service you request.",
  },
  {
    title: "Security, abuse prevention, and operations",
    description:
      "We process limited technical and presence data to protect the service, apply rate limits, diagnose failures, monitor availability, and keep the application functioning safely.",
    legalBasis: "Legal basis: legitimate interests in security and reliable operation.",
  },
] as const;

const providerRows = [
  {
    title: "Supabase",
    description:
      "Supabase provides authentication, session handling, and the user identity used by RSMethods to maintain your account.",
  },
  {
    title: "Google",
    description:
      "If you choose Google sign-in, Google acts as the external identity provider in that authentication flow.",
  },
  {
    title: "Vercel",
    description: "Vercel is referenced for frontend hosting.",
  },
  {
    title: "Railway",
    description: "Railway is referenced for backend hosting.",
  },
  {
    title: "RuneScape Wiki and Jagex",
    description:
      "When you use OSRS player-based features, RSMethods sends the OSRS username you provide to RuneScape Wiki and Jagex endpoints to retrieve public character information.",
  },
] as const;

const securityItems = [
  "Supabase bearer-token authentication and JWT validation against Supabase JWKS on the backend.",
  "CORS allow-list configuration and HTTP security headers through Helmet.",
  "Rate limiting for the application, including dedicated throttling on presence heartbeats.",
  "Server-side validation, whitelist filtering, and request body-size limits.",
  "Role-based access controls for restricted actions.",
  "Sanitization controls for markdown and user-supplied rich content where implemented.",
] as const;

function PolicySection({
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

function TextList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function PrivacyPolicyPage() {
  useSeo({
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    path: "/privacy-policy",
  });

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className={`${PUBLIC_PANEL_CLASS} p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={PUBLIC_SECTION_EYEBROW_CLASS}>Legal</p>
            <h1 className={PUBLIC_TITLE_CLASS}>Privacy Policy</h1>
            <p className={`mt-2 max-w-3xl ${PUBLIC_BODY_CLASS}`}>
              This Privacy Policy explains how RSMethods processes personal data
              when you use the service.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>

        <div className={`${PUBLIC_HIGHLIGHT_CLASS} mt-6 rounded-xl p-5`}>
          <p className="text-sm font-semibold text-foreground">
            This policy applies when you browse RSMethods, sign in, save
            preferences, like items, or use OSRS player-based features.
          </p>
          <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
            It describes the data flows used by the service as it is currently
            built.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <PolicySection title="Who We Are">
            <p>
              RSMethods is operated by{" "}
              <span className="font-semibold text-foreground">
                Carmine Andrés Buonaiuto Daniele
              </span>
              , an individual based in Spain.
            </p>
            <p>
              For privacy matters, you can contact{" "}
              <a
                className={PUBLIC_LINK_CLASS}
                href="mailto:contact@rsmethods.com"
              >
                contact@rsmethods.com
              </a>
              .
            </p>
          </PolicySection>

          <PolicySection title="Data We Process">
            <TextList items={dataCategories} />
          </PolicySection>

          <PolicySection title="Why We Process Your Data">
            <div className="space-y-4">
              {purposeRows.map((row) => (
                <article
                  key={row.title}
                  className="rounded-lg border border-border/70 p-4"
                >
                  <h3 className="font-semibold text-foreground">{row.title}</h3>
                  <p className="mt-2">{row.description}</p>
                  <p className="mt-2 font-medium text-foreground">
                    {row.legalBasis}
                  </p>
                </article>
              ))}
            </div>
          </PolicySection>

          <PolicySection title="Authentication">
            <p>
              If you sign up or sign in with email and password, you provide
              that information through Supabase Auth.
            </p>
            <p>
              RSMethods does not store your password in its own application
              database, and the RSMethods backend does not receive or store your
              password as part of normal account authentication.
            </p>
            <p>
              RSMethods uses your Supabase user ID and email address to
              maintain your account and uses session or access tokens to
              authenticate requests to the backend.
            </p>
            <p>
              If you choose Google sign-in, Google is used as the external
              identity provider through the Supabase authentication flow.
            </p>
          </PolicySection>

          <PolicySection title="OSRS Player Data">
            <p>
              Providing an OSRS username is optional. If you provide one,
              RSMethods may send it to the backend and then to{" "}
              <span className="font-semibold text-foreground">
                sync.runescape.wiki
              </span>{" "}
              and{" "}
              <span className="font-semibold text-foreground">
                secure.runescape.com
              </span>{" "}
              to retrieve public character information such as levels,
              experience, quests, and achievement diaries.
            </p>
            <p>
              RSMethods uses that information to support OSRS filters and
              roadmap features.
            </p>
            <p>
              This player data is requested on demand and is not stored
              persistently in the application database. Your OSRS username may
              also be stored locally in your browser for convenience.
            </p>
          </PolicySection>

          <PolicySection title="Browser Storage">
            <ul className="space-y-3">
              <li>Theme preferences may be stored in your browser.</li>
              <li>Your OSRS username may be stored locally in your browser.</li>
              <li>
                Supabase authentication session data, including the access and
                refresh session used to keep you signed in across page reloads,
                may be stored in browser storage.
              </li>
              <li>
                Temporary authentication recovery and post-login redirect data
                may also be stored for the current browser session.
              </li>
              <li>
                Table layout preferences may be stored for the current signed-in
                session.
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="Service Providers">
            <div className="space-y-4">
              {providerRows.map((row) => (
                <article
                  key={row.title}
                  className="rounded-lg border border-border/70 p-4"
                >
                  <h3 className="font-semibold text-foreground">{row.title}</h3>
                  <p className="mt-2">{row.description}</p>
                </article>
              ))}
            </div>
          </PolicySection>

          <PolicySection title="Technical Logs and Security">
            <p>
              The application uses technical request logs and online-presence
              heartbeats to operate the service and support troubleshooting.
            </p>
            <p>
              Application request logs record the HTTP method, endpoint path,
              response status, and processing time. They do not include
              query-string values, request bodies, authorization tokens, email
              addresses, user IDs, IP addresses, or user-agent strings.
            </p>
            <p>
              For live online counts, signed-in users are counted through their
              authenticated account identity. Anonymous visitors use a temporary
              identifier for the active browser context and not a persistent
              browser identifier.
            </p>
            <TextList items={securityItems} />
          </PolicySection>

          <PolicySection title="Data Retention">
            <p>
              Account data is retained while your account exists, while it is
              needed to provide the service, and until you request deletion,
              subject to limited additional retention where necessary for
              security, fraud prevention, legal obligations, or legal claims.
            </p>
            <p>
              Likes remain associated with your account until you remove them or
              the related account data is deleted.
            </p>
            <p>
              Browser-stored data remains until it is cleared, overwritten, you
              sign out where applicable, or the browser session ends.
            </p>
            <p>
              Supabase authentication session data remains in browser storage
              until you sign out, it is replaced by a newer session, it expires
              according to the authentication flow, or browser storage is
              cleared.
            </p>
            <p>
              Live presence records are short-lived and currently expire after
              about 90 seconds. Aggregated hourly presence history is cleaned
              after 72 hours, and aggregated daily presence history is retained
              for up to 3 years.
            </p>
            <p>
              Technical application logs are retained for up to 30 days.
            </p>
            <p>RSMethods does not currently apply an inactivity auto-delete policy.</p>
          </PolicySection>

          <PolicySection title="Account and Data Deletion">
            <p>
              RSMethods does not currently provide a self-service account
              deletion tool.
            </p>
            <p>
              If you want your account and related data deleted, contact{" "}
              <a
                className={PUBLIC_LINK_CLASS}
                href="mailto:contact@rsmethods.com"
              >
                contact@rsmethods.com
              </a>
              .
            </p>
            <p>
              We will review and handle deletion requests for the data we
              control, subject to any limited retention that remains necessary
              for security, abuse prevention, legal obligations, or legal
              claims.
            </p>
          </PolicySection>

          <PolicySection title="International Data Transfers">
            <p>
              Some service providers used by RSMethods may process personal data
              outside the European Economic Area.
            </p>
            <p>
              Where international transfers are required, RSMethods relies on
              the safeguards and lawful transfer mechanisms made available by
              the relevant provider where applicable.
            </p>
          </PolicySection>

          <PolicySection title="Your Rights">
            <p>
              Depending on the law that applies to you, you may have rights to
              access your personal data, request correction or deletion, request
              restriction, object to certain processing, and receive a portable
              copy of data you provided to us.
            </p>
            <p>
              You may also have the right to complain to a supervisory
              authority.
            </p>
          </PolicySection>

          <PolicySection title="Contact">
            <p>
              For privacy questions, requests, or deletion requests, contact{" "}
              <a
                className={PUBLIC_LINK_CLASS}
                href="mailto:contact@rsmethods.com"
              >
                contact@rsmethods.com
              </a>
              .
            </p>
          </PolicySection>

          <PolicySection title="Last Updated">
            <p>{LAST_UPDATED}</p>
          </PolicySection>
        </div>
      </div>
    </section>
  );
}

export default PrivacyPolicyPage;
