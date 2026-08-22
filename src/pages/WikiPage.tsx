import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  PUBLIC_ELEVATED_PANEL_CLASS,
  PUBLIC_HIGHLIGHT_CLASS,
  PUBLIC_LINK_CLASS,
  PUBLIC_PAGE_BACKGROUND_CLASS,
  PUBLIC_SECTION_EYEBROW_CLASS,
} from "@/components/public-page/publicPageStyles";
import { cn } from "@/lib/utils";
import { useSeo } from "@/hooks/useSeo";

type WikiCategorySlug = "general" | "metrics" | "usage";

type WikiSection = {
  id: string;
  label: string;
  title: string;
  description: string;
  content: ReactNode;
};

type WikiCategory = {
  slug: WikiCategorySlug;
  title: string;
  shortDescription: string;
  intro: string;
  sections: WikiSection[];
};

type WikiDelayedNavigationState = {
  pendingSectionId?: string;
  delayedScrollMs?: number;
};

const CATEGORY_ORDER: WikiCategorySlug[] = ["general", "metrics", "usage"];
const WIKI_BODY_TEXT_CLASS =
  "space-y-3 text-sm leading-relaxed text-muted-foreground";
const WIKI_BODY_STACK_CLASS =
  "space-y-4 text-sm leading-relaxed text-muted-foreground";
const WIKI_FORMULA_BLOCK_CLASS =
  "rounded-md border border-border/70 bg-surface-panel-subtle px-3 py-3";

const WIKI_CATEGORIES: Record<WikiCategorySlug, WikiCategory> = {
  general: {
    slug: "general",
    title: "Overview",
    shortDescription:
      "What the app does, where the data comes from, how often it changes, and how to read it.",
    intro:
      "This category explains the product in plain language: what you are looking at, where it comes from, and how to interpret changes without overreacting to spikes.",
    sections: [
      {
        id: "overview",
        label: "What the app does",
        title: "What RSMethods does",
        description: "The product goal in plain language.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>
              RSMethods helps you choose methods to earn GP or train skills with
              recent, comparable data.
            </p>
            <p>
              Instead of opening many pages, you get one view with profitability,
              market stability, practical difficulty, and requirements.
            </p>
            <Separator />
            <p>
              It does not show only a final number. It also shows context so you
              can answer: &quot;This pays well, but can I actually run it right
              now?&quot;
            </p>
          </div>
        ),
      },
      {
        id: "sources",
        label: "Data sources",
        title: "Where the data really comes from",
        description: "The sources the backend uses to build metrics.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>
              The backend combines several official sources and then normalizes
              them into a readable model:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Tradeable prices: the official OSRS Wiki price API
                (`/api/v1/osrs/latest`).
              </li>
              <li>
                Hourly item volume: the OSRS Wiki API (`/api/v1/osrs/1h`).
              </li>
              <li>
                Base item catalog: OSRS Wiki mapping
                (`/api/v1/osrs/mapping`).
              </li>
              <li>
                Account profile, if you enter a username:
                `sync.runescape.wiki` (levels, quests, diaries).
              </li>
              <li>
                Methods, variants, and requirements: the product&apos;s own
                database maintained by admins.
              </li>
            </ul>
            <p>
              If an external API is down or delayed, the app may return partial
              state and warning messages.
            </p>
          </div>
        ),
      },
      {
        id: "refresh",
        label: "Refresh cadence",
        title: "How often values really update",
        description: "Why numbers can change even when you touch nothing.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <ul className="list-disc space-y-1 pl-5">
              <li>Item prices: every minute.</li>
              <li>Method profits, both high and low: every minute.</li>
              <li>Profit history snapshots: every 5 minutes.</li>
              <li>24-hour aggregate volume: once per hour.</li>
              <li>
                Frontend refresh: periodic automatic refresh, with exact timing
                depending on the client.
              </li>
            </ul>
            <Separator />
            <p>
              Advanced note: tradeables mostly update when their prices move.
              Untradeables are recalculated through rules so the data stays
              internally consistent.
            </p>
          </div>
        ),
      },
      {
        id: "data-reading",
        label: "How to read changes",
        title: "What a rise or drop actually means",
        description: "A quick guide to avoid overreacting.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>
              A short-term jump in `highProfit` does not always mean
              &quot;best method of the day.&quot; It can be a brief spike caused
              by low market volume.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Check `lowProfit` for a conservative scenario.</li>
              <li>Check `marketImpact` to see whether the market can absorb you.</li>
              <li>Use history to confirm whether it is a trend or just noise.</li>
            </ul>
          </div>
        ),
      },
    ],
  },
  metrics: {
    slug: "metrics",
    title: "How metrics work",
    shortDescription:
      "Real formulas for untradeables, GP/hr, market impact, trends, and scores.",
    intro:
      "This category explains the math in human terms so you can understand how the backend calculates the most important fields.",
    sections: [
      {
        id: "untradeables",
        label: "Untradeables",
        title: "How an item is valued without a direct price",
        description:
          "Rules that convert non-tradeable items into usable value.",
        content: (
          <div className={WIKI_BODY_STACK_CLASS}>
            <p>
              If an item has no direct market price, the backend applies rules
              so it can still participate in profit calculations.
            </p>
            <div className={`space-y-3 ${WIKI_FORMULA_BLOCK_CLASS}`}>
              <div>
                <p className="text-sm font-semibold text-foreground">FIXED</p>
                <p className="text-sm">
                  Manual fixed price: `low = L`, `high = H`.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">RECIPE</p>
                <p className="text-sm">
                  Sum the component cost: `low = SUM(quantity_i * low_i)` and
                  `high = SUM(quantity_i * high_i)`.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  BEST_RECIPE
                </p>
                <p className="text-sm">
                  If multiple valid recipes exist, the cheapest one is chosen
                  for each band: `bestLow = MIN(recipeLow)` and `bestHigh =
                  MIN(recipeHigh)`.
                </p>
              </div>
            </div>
            <p>
              Result: untradeables enter the same downstream pipeline as every
              other item.
            </p>
          </div>
        ),
      },
      {
        id: "profit",
        label: "High and low GP/hr",
        title: "The exact High Profit and Low Profit formulas",
        description: "It is not one number. It is two execution scenarios.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>For each variant, the backend calculates two bands:</p>
            <div className={WIKI_FORMULA_BLOCK_CLASS}>
              <p>`outputsLow = SUM(output.qty * output.lowPrice)`</p>
              <p>`outputsHigh = SUM(output.qty * output.highPrice)`</p>
              <p>`inputsHigh = SUM(input.qty * input.highPrice)`</p>
              <p>`inputsLow = SUM(input.qty * input.lowPrice)`</p>
              <Separator />
              <p>`lowProfit = outputsLow - inputsHigh`</p>
              <p>`highProfit = outputsHigh - inputsLow`</p>
            </div>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                `High Profit` is optimistic: you sell high and buy low.
              </li>
              <li>
                `Low Profit` is conservative: you sell low and buy high.
              </li>
            </ul>
            <p>
              Important: profit comes from `inputs`, `outputs`, and prices. The
              `actionsPerHour` field is metadata about the method and is not
              multiplied in separately here.
            </p>
          </div>
        ),
      },
      {
        id: "gp-per-xp",
        label: "GP per XP",
        title: "How GP/XP is calculated",
        description: "This exists only when you choose a specific skill.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>
              If you filter by skill, the backend reads that skill&apos;s XP/hr
              from `xpHour` and calculates:
            </p>
            <div className={WIKI_FORMULA_BLOCK_CLASS}>
              <p>`gpPerXpHigh = highProfit / xpHour(selectedSkill)`</p>
              <p>`gpPerXpLow = lowProfit / xpHour(selectedSkill)`</p>
            </div>
            <p>
              If the variant does not grant XP for that skill, it is excluded
              from that filter and sort mode.
            </p>
          </div>
        ),
      },
      {
        id: "market-move",
        label: "% market move",
        title: "The real market impact formula, instant and slow",
        description:
          "It measures how heavy your method is relative to real market volume.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>
              For each item, the backend estimates its per-hour market share and
              then weights that share by the item&apos;s economic value.
            </p>
            <div className={`${WIKI_FORMULA_BLOCK_CLASS} text-xs sm:text-sm`}>
              <p>`volumePerHour = max(epsilon, volume24h / 24)`</p>
              <p>`shareItem = quantity / volumePerHour`</p>
              <p>`valueItem = quantity * priceWeight`</p>
              <p>
                `weightedShare = SUM((valueItem / SUM(valueItem)) * shareItem)`
              </p>
              <Separator />
              <p>
                `impactInstant = alpha * shareInputsInstant + (1-alpha) *
                shareOutputsInstant`
              </p>
              <p>
                `impactSlow = alpha * shareInputsSlow + (1-alpha) *
                shareOutputsSlow`
              </p>
            </div>
            <ul className="list-disc space-y-1 pl-5">
              <li>Defaults: `alpha = 0.5` and `epsilon = 1`.</li>
              <li>
                `instant`: inputs use high price and high-volume assumptions;
                outputs use low price assumptions.
              </li>
              <li>
                `slow`: inputs use low assumptions; outputs use high assumptions.
              </li>
              <li>
                If an item is missing volume data, that item is treated as local
                maximum impact.
              </li>
              <li>The value can exceed 1.0. It is not capped.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "trends",
        label: "Trends",
        title: "How 1h, 24h, week, and month trends are calculated",
        description: "Percentage change versus older snapshots.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>
              The backend compares the current `highProfit` with the latest
              available historical value before each time window.
            </p>
            <div className={WIKI_FORMULA_BLOCK_CLASS}>
              <p>`trend% = ((highCurrent - highPast) / highPast) * 100`</p>
            </div>
            <p>
              If there is no valid older point for that window, the trend stays
              `null`.
            </p>
          </div>
        ),
      },
      {
        id: "scores",
        label: "AFK and clicks",
        title: "AFKiness, Click Intensity, and Risk Level",
        description: "How to interpret these fields without overreading them.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>AFKiness:</strong> how much attention margin the method
                gives you.
              </li>
              <li>
                <strong>Click Intensity:</strong> how interactive the method is.
                Higher means more active.
              </li>
              <li>
                <strong>Risk level:</strong> estimated risk based on the
                method&apos;s setup.
              </li>
            </ul>
            <p>
              These fields come from variant design, not automatic real-time
              telemetry. They exist to adapt results to your playstyle.
            </p>
          </div>
        ),
      },
    ],
  },
  usage: {
    slug: "usage",
    title: "Using the app",
    shortDescription:
      "Filters, history, username mode, variants, likes, and advanced reading tips.",
    intro:
      "This category helps you make more robust decisions, not just read tables. It explains why a method surfaces higher or lower and how to use that information well.",
    sections: [
      {
        id: "filters",
        label: "Filters and sorting",
        title: "How to filter and sort without bias",
        description: "Shortcuts to real, executable methods.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>
              You can filter by skill, category, minimum AFK, maximum click
              intensity, risk level, whether a method gives XP, and whether it
              is profitable.
            </p>
            <p>
              You can sort by `highProfit`, `xpHour`, `gpPerXp`, `likes`,
              `afkiness`, or `clickIntensity`.
            </p>
            <Separator />
            <p>
              Practical rule: if you care about stability, prioritize the
              combination of `lowProfit + marketImpact + trend`, not just
              `highProfit`.
            </p>
          </div>
        ),
      },
      {
        id: "variants-mode",
        label: "best vs all",
        title: "The difference between best and all variants",
        description: "Why you sometimes see only one variant per method.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>best:</strong> shows only the highest-`highProfit`
                variant for each method.
              </li>
              <li>
                <strong>all:</strong> shows one row per variant for finer
                comparison.
              </li>
            </ul>
            <p>
              Use `best` for quick exploration. Use `all` when you need to
              optimize details.
            </p>
          </div>
        ),
      },
      {
        id: "history",
        label: "History and trends",
        title: "Do not decide from the current value alone",
        description: "Use time aggregation to separate noise from trend.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>
              The history view supports multiple ranges (`24h`, `1m`, `1y`,
              `all`) and aggregations:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>avg:</strong> average per time bucket.
              </li>
              <li>
                <strong>close:</strong> last value in the bucket.
              </li>
              <li>
                <strong>ohlc:</strong> open, high, low, close for candle-style
                reading.
              </li>
            </ul>
            <p>
              The backend adjusts granularity automatically so you do not get
              thousands of useless points.
            </p>
          </div>
        ),
      },
      {
        id: "user-context",
        label: "Username mode",
        title: "Real personalization with your account",
        description: "Filter methods by levels, quests, and diaries.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>
              When you enter a username, the backend compares your stats
              against each variant&apos;s requirements: levels, quests, and
              achievement diaries.
            </p>
            <p>
              It also returns `missingRequirements` so the UI can show exactly
              what you still need to unlock.
            </p>
            <Separator />
            <p>Key rules:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                If a requirement asks for `Combat`, it is validated against
                `Attack`, `Strength`, and `Defence`.
              </li>
              <li>
                For quests, your stage must be greater than or equal to the
                required stage.
              </li>
              <li>
                For diaries, the requested tier must be marked complete.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "likes",
        label: "Likes and favorites",
        title: "How to use likes to prioritize",
        description: "Useful social signal, but never absolute.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>
              You can like methods and later filter by `likedByMe` to build a
              personal shortlist.
            </p>
            <p>
              Likes help surface popular methods, but they should not replace
              your profitability and stability filters.
            </p>
          </div>
        ),
      },
      {
        id: "frontend",
        label: "How to read the UI",
        title: "Recommended decision flow",
        description: "A simple sequence that reduces mistakes.",
        content: (
          <div className={WIKI_BODY_TEXT_CLASS}>
            <p>
              <strong>1) Main table:</strong> filter by your goal, whether that
              is profit, XP, or comfort.
            </p>
            <p>
              <strong>2) Variant detail:</strong> validate inputs, outputs,
              requirements, trends, and market impact.
            </p>
            <p>
              <strong>3) History:</strong> confirm the current value is not just
              an isolated spike.
            </p>
            <p>
              <strong>4) Execution:</strong> start from the conservative
              scenario (`lowProfit`) and then adjust to the real market.
            </p>
          </div>
        ),
      },
    ],
  },
};

function normalizeWikiCategorySlug(
  value: string | undefined,
): WikiCategorySlug | null {
  if (value === "general" || value === "metrics" || value === "usage") {
    return value;
  }

  if (value === "metricas") {
    return "metrics";
  }

  if (value === "uso") {
    return "usage";
  }

  return null;
}

function categoryPath(slug: WikiCategorySlug) {
  return slug === "general" ? "/wiki" : `/wiki/${slug}`;
}

function sectionPath(slug: WikiCategorySlug, sectionId: string) {
  return `${categoryPath(slug)}#${sectionId}`;
}

function SectionCard({
  section,
  isHighlighted,
}: {
  section: WikiSection;
  isHighlighted: boolean;
}) {
  return (
    <section
      id={section.id}
      className={cn(
        "scroll-mt-24 space-y-3 rounded-md -mx-2 px-2 py-5 transition-all duration-700",
        isHighlighted && PUBLIC_HIGHLIGHT_CLASS,
      )}
    >
      <h2 className="text-3xl font-bold tracking-tight text-foreground">
        {section.title}
      </h2>
      <p className="text-sm text-muted-foreground">{section.description}</p>
      <div>{section.content}</div>
    </section>
  );
}

function WikiContent({
  requestedCategory,
}: {
  requestedCategory?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const delayedNavigationState =
    (location.state as WikiDelayedNavigationState | null) ?? null;
  const pendingDelayedSectionId = delayedNavigationState?.pendingSectionId;
  const categorySlug =
    requestedCategory === undefined
      ? "general"
      : normalizeWikiCategorySlug(requestedCategory);
  const category = categorySlug ? WIKI_CATEGORIES[categorySlug] : null;
  const [activeSection, setActiveSection] = useState<string>("");
  const [highlightedSection, setHighlightedSection] = useState<string | null>(
    null,
  );
  const [isHeaderHighlighted, setIsHeaderHighlighted] = useState(false);
  const sectionHighlightTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const headerHighlightTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const hasMountedRef = useRef(false);

  useSeo({
    title: category
      ? `${category.title} | RSMethods Wiki`
      : "Category not found | RSMethods Wiki",
    description: category
      ? `${category.title}: ${category.shortDescription}`
      : "The requested category does not exist in the wiki.",
    path: category ? categoryPath(category.slug) : "/wiki",
    keywords: "rsmethods wiki, osrs guide",
  });

  useEffect(() => {
    if (!category) return;
    setActiveSection(category.sections[0]?.id ?? "");
  }, [category]);

  useEffect(() => {
    return () => {
      if (sectionHighlightTimeoutRef.current) {
        clearTimeout(sectionHighlightTimeoutRef.current);
      }
      if (headerHighlightTimeoutRef.current) {
        clearTimeout(headerHighlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!category) return;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (location.hash) return;
    if (pendingDelayedSectionId) return;

    if (headerHighlightTimeoutRef.current) {
      clearTimeout(headerHighlightTimeoutRef.current);
    }
    setIsHeaderHighlighted(true);
    headerHighlightTimeoutRef.current = setTimeout(() => {
      setIsHeaderHighlighted(false);
    }, 850);
  }, [category, location.hash, location.pathname, pendingDelayedSectionId]);

  useEffect(() => {
    if (!category || !location.hash) return;
    const targetId = location.hash.slice(1);
    if (!category.sections.some((section) => section.id === targetId)) return;

    const targetSection = document.getElementById(targetId);
    if (!targetSection) return;

    const frame = window.requestAnimationFrame(() => {
      targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(targetId);
      if (sectionHighlightTimeoutRef.current) {
        clearTimeout(sectionHighlightTimeoutRef.current);
      }
      setHighlightedSection(targetId);
      sectionHighlightTimeoutRef.current = setTimeout(() => {
        setHighlightedSection(null);
      }, 850);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [category, location.hash, location.pathname]);

  useEffect(() => {
    if (!category) return;
    const targetId = delayedNavigationState?.pendingSectionId;
    if (!targetId) return;
    if (!category.sections.some((section) => section.id === targetId)) return;

    window.scrollTo({ top: 0, behavior: "auto" });
    setActiveSection("");

    const delayMs = Math.max(
      120,
      delayedNavigationState.delayedScrollMs ?? 220,
    );
    const timeoutId = window.setTimeout(() => {
      const targetSection = document.getElementById(targetId);
      if (!targetSection) {
        navigate(location.pathname, { replace: true, state: null });
        return;
      }

      targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(targetId);
      if (sectionHighlightTimeoutRef.current) {
        clearTimeout(sectionHighlightTimeoutRef.current);
      }
      setHighlightedSection(targetId);
      sectionHighlightTimeoutRef.current = setTimeout(() => {
        setHighlightedSection(null);
      }, 850);

      navigate(location.pathname, { replace: true, state: null });
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [category, delayedNavigationState, location.pathname, navigate]);

  const onSectionClick = (
    event: MouseEvent<HTMLAnchorElement>,
    slug: WikiCategorySlug,
    sectionId: string,
  ) => {
    if (!category) return;

    if (category.slug !== slug) {
      event.preventDefault();
      navigate(categoryPath(slug), {
        state: {
          pendingSectionId: sectionId,
          delayedScrollMs: 220,
        } satisfies WikiDelayedNavigationState,
      });
      return;
    }

    event.preventDefault();
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    const nextHash = `#${sectionId}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${nextHash}`,
      );
    }

    targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(sectionId);
    if (sectionHighlightTimeoutRef.current) {
      clearTimeout(sectionHighlightTimeoutRef.current);
    }
    setHighlightedSection(sectionId);
    sectionHighlightTimeoutRef.current = setTimeout(() => {
      setHighlightedSection(null);
    }, 850);
  };

  const onCategoryClick = (
    event: MouseEvent<HTMLAnchorElement>,
    slug: WikiCategorySlug,
  ) => {
    if (!category || category.slug !== slug) return;

    event.preventDefault();
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveSection(category.sections[0]?.id ?? "");

    if (headerHighlightTimeoutRef.current) {
      clearTimeout(headerHighlightTimeoutRef.current);
    }
    setIsHeaderHighlighted(true);
    headerHighlightTimeoutRef.current = setTimeout(() => {
      setIsHeaderHighlighted(false);
    }, 850);
  };

  if (!category) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Card className={PUBLIC_ELEVATED_PANEL_CLASS}>
          <CardHeader>
            <CardTitle>Category not found</CardTitle>
            <CardDescription>
              The requested path does not exist inside the wiki.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/wiki" className={PUBLIC_LINK_CLASS}>
              Back to Overview
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={PUBLIC_PAGE_BACKGROUND_CLASS}>
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
        <div className="grid gap-6 pt-2 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)]">
            <Card className={`h-full ${PUBLIC_ELEVATED_PANEL_CLASS}`}>
              <CardContent className="px-0 pb-0 pt-0">
                <ScrollArea className="h-[50vh] px-4 pb-3 pt-1 lg:h-[calc(100vh-15rem)]">
                  <nav className="space-y-4" aria-label="Wiki category menu">
                    {CATEGORY_ORDER.map((slug) => {
                      const menuCategory = WIKI_CATEGORIES[slug];
                      const isActiveCategory = category.slug === slug;

                      return (
                        <div key={slug} className="space-y-1">
                          <Link
                            to={categoryPath(slug)}
                            onClick={(event) => onCategoryClick(event, slug)}
                            className="block rounded-md px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
                          >
                            {menuCategory.title}
                          </Link>
                          <div className="space-y-1 pl-3">
                            {menuCategory.sections.map((section) => {
                              const isActiveSection =
                                isActiveCategory &&
                                activeSection === section.id;

                              return (
                                <Link
                                  key={section.id}
                                  to={sectionPath(slug, section.id)}
                                  onClick={(event) =>
                                    onSectionClick(event, slug, section.id)
                                  }
                                  className={cn(
                                    "block rounded-md px-3 py-1.5 text-sm transition-colors",
                                    isActiveSection
                                      ? "bg-accent font-medium text-accent-foreground"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                  )}
                                >
                                  {section.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </nav>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          <article className="space-y-0 pt-2">
            <section
              className={cn(
                "mt-5 space-y-3 rounded-md -mx-2 px-2 pb-5 transition-all duration-700",
                isHeaderHighlighted && PUBLIC_HIGHLIGHT_CLASS,
              )}
            >
              <p className={PUBLIC_SECTION_EYEBROW_CLASS}>RSMethods Wiki</p>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {category.title}
              </h1>
              <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {category.intro}
              </p>
            </section>
            <Separator />

            {category.sections.map((section, index) => (
              <div key={section.id}>
                <SectionCard
                  section={section}
                  isHighlighted={highlightedSection === section.id}
                />
                {index < category.sections.length - 1 ? <Separator /> : null}
              </div>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}

export function WikiPage() {
  return <WikiContent />;
}

export function WikiCategoryPage() {
  const { category } = useParams<{ category: string }>();
  return <WikiContent requestedCategory={category} />;
}
