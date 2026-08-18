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
import {
  TERMS_AFFILIATION_NOTICE_PARAGRAPHS,
  TERMS_AFFILIATION_NOTICE_TITLE,
} from "@/lib/legalNotice";
import { CURRENT_TERMS_LAST_UPDATED_LABEL } from "@/lib/termsOfUse";

const SEO_TITLE = "Terms of Use | RSMethods";
const SEO_DESCRIPTION =
  "Terms of Use for RSMethods, including account responsibilities, acceptable use, third-party services, and limitation of liability.";
const sections = [
  {
    title: "Using RSMethods",
    paragraphs: [
      "RSMethods provides OSRS-related tools, account features, and reference content for informational and community use.",
      "You may use the service only in compliance with applicable law and these Terms of Use.",
    ],
  },
  {
    title: "Accounts",
    paragraphs: [
      "You are responsible for the accuracy of the information you provide when creating an account and for maintaining the confidentiality of your account credentials.",
      "You must not share access to your account in a way that risks misuse, abuse, or unauthorized activity on the service.",
    ],
  },
  {
    title: "Acceptable Use",
    paragraphs: [
      "You must not use RSMethods to interfere with the service, attempt unauthorized access, scrape protected areas, abuse rate limits, or submit unlawful, harmful, or deceptive content.",
      "You must not use the service in a way that degrades availability for other users.",
    ],
  },
  {
    title: "Third-Party Services",
    paragraphs: [
      "RSMethods relies on third-party providers for authentication, hosting, and some data retrieval workflows.",
      "Some features may depend on services operated by providers such as Supabase, Google, Vercel, Railway, RuneScape Wiki, or Jagex, and those services may change independently of RSMethods.",
    ],
  },
  {
    title: "Intellectual Property",
    paragraphs: [
      "RSMethods and its original content, design, and application logic remain the property of their respective owner unless stated otherwise.",
      "Third-party trademarks, game assets, and referenced materials remain the property of their respective owners.",
    ],
  },
  {
    title: TERMS_AFFILIATION_NOTICE_TITLE,
    paragraphs: [...TERMS_AFFILIATION_NOTICE_PARAGRAPHS],
  },
  {
    title: "Availability and Changes",
    paragraphs: [
      "RSMethods may evolve, change features, or remove functionality at any time to improve reliability, security, or maintainability.",
      "The service is provided on an as-available basis and may experience interruptions, maintenance windows, or provider-related outages.",
    ],
  },
  {
    title: "Limitation of Liability",
    paragraphs: [
      "To the extent permitted by law, RSMethods is provided without warranties of any kind, whether express or implied.",
      "RSMethods is not liable for indirect, incidental, special, consequential, or exemplary damages arising from your use of the service.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [],
  },
] as const;

function TermsSection({
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

export function TermsOfUsePage() {
  useSeo({
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    path: "/terms-of-use",
  });

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className={`${PUBLIC_PANEL_CLASS} p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={PUBLIC_SECTION_EYEBROW_CLASS}>Legal</p>
            <h1 className={PUBLIC_TITLE_CLASS}>Terms of Use</h1>
            <p className={`mt-2 max-w-3xl ${PUBLIC_BODY_CLASS}`}>
              These Terms of Use govern access to and use of RSMethods.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>

        <div className={`${PUBLIC_HIGHLIGHT_CLASS} mt-6 rounded-xl p-5`}>
          <p className="text-sm font-semibold text-foreground">
            By creating an account or using RSMethods, you agree to follow these
            terms.
          </p>
          <p className={`mt-2 ${PUBLIC_BODY_CLASS}`}>
            Please also review the{" "}
            <Link className={PUBLIC_LINK_CLASS} to="/privacy-policy">
              Privacy Policy
            </Link>{" "}
            for information about how personal data is processed.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {sections.map((section) => (
            <TermsSection key={section.title} title={section.title}>
              {section.title === "Contact" ? (
                <p>
                  For legal or account-related questions about these Terms of
                  Use, contact{" "}
                  <a
                    className={PUBLIC_LINK_CLASS}
                    href="mailto:contact@rsmethods.com"
                  >
                    contact@rsmethods.com
                  </a>
                  .
                </p>
              ) : (
                section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))
              )}
            </TermsSection>
          ))}

          <TermsSection title="Last Updated">
            <p>{CURRENT_TERMS_LAST_UPDATED_LABEL}</p>
          </TermsSection>
        </div>
      </div>
    </section>
  );
}

export default TermsOfUsePage;
