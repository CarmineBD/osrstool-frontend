import { lazy, Suspense } from "react";
import {
  IconClick,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Markdown from "@/components/Markdown";
import { formatNumber, formatPercent, getUrlByType } from "@/lib/utils";
import type { Item, Variant } from "@/lib/api";

const LazyVariantHistoryChart = lazy(() => import("@/components/VariantHistoryChart"));

interface MethodVariantContentProps {
  variant: Variant;
  itemsMap: Record<number, Item>;
  username?: string;
  inputsTotal: number;
  outputsTotal: number;
}

function focusUsernameInput() {
  const usernameInput = document.getElementById(
    "username-input"
  ) as HTMLInputElement | null;
  if (!usernameInput) return;
  usernameInput.focus();
  usernameInput.select?.();
}

function LevelsAndQuestBadges({ requirement }: { requirement?: Variant["requirements"] }) {
  return (
    <>
      {(requirement?.levels || []).map(({ skill, level }) => (
        <Badge size="lg" key={skill} variant="secondary">
          <img
            src={getUrlByType(skill) ?? ""}
            alt={`${skill.toLowerCase()}_icon`}
            title={skill}
          />
          {level}
        </Badge>
      ))}
      {(requirement?.quests || []).map(({ name, stage }) => (
        <Badge size="lg" key={name} variant="secondary">
          <img src={getUrlByType("quests") ?? ""} alt="quests_icon" title="quests" />
          {stage === 1 ? name : `${name} (started)`}
        </Badge>
      ))}
      {(requirement?.achievement_diaries || []).map(({ name, tier }) => (
        <Badge size="lg" key={`${name}_${tier}`} variant="secondary">
          <img
            src={getUrlByType("achievement_diaries") ?? ""}
            alt="achievement_diaries_icon"
            title="quests"
          />
          {`${name} ${tier}`}
        </Badge>
      ))}
    </>
  );
}

function ItemRequirementIcons({ items, itemsMap }: { items?: Variant["inputs"]; itemsMap: Record<number, Item> }) {
  return (
    <>
      {(items || []).map(({ id, quantity }) => {
        const item = itemsMap[id];
        if (!item) return null;
        return (
          <div key={id} className="relative">
            <img src={item.iconUrl} alt={item.name} title={item.name} />
            {quantity > 1 ? (
              <span className="absolute -top-1 -right-1 rounded bg-black/70 px-1 text-xs text-white">
                {quantity}
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function MissingRequirementsNotice({
  variant,
  username,
}: {
  variant: Variant;
  username?: string;
}) {
  return (
    <div className="mb-4 rounded-md border border-gray-300 bg-gray-200 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
      {!username ? (
        <p className="mb-3 text-gray-700">
          Please{" "}
          <button
            type="button"
            className="cursor-pointer text-blue-600 underline hover:text-blue-800"
            onClick={focusUsernameInput}
          >
            enter your username
          </button>{" "}
          to fetch your user data.
        </p>
      ) : null}

      {variant.missingRequirements ? (
        <>
          <p className="mb-4 text-red-600">
            You are missing some requirements to do this method:
          </p>
          <div className="flex flex-start flex-wrap gap-2">
            <LevelsAndQuestBadges requirement={variant.missingRequirements} />
          </div>
        </>
      ) : username ? (
        <p className="text-green-600">All requirements met!</p>
      ) : null}
    </div>
  );
}

function MetricsCards({ variant }: { variant: Variant }) {
  return (
    <div className="order-1 flex flex-col gap-2 lg:order-2 lg:col-span-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Gp/hr</CardDescription>
          <CardTitle className="flex items-center gap-3 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <figure className="shrink-0">
              <img
                src="https://oldschool.runescape.wiki/images/Coins_10000.png"
                alt="Coins"
                title="Coins"
                className="size-6 shrink-0 object-contain"
              />
            </figure>

            {variant.highProfit !== undefined ? formatNumber(variant.highProfit) : "N/A"}
          </CardTitle>
          <CardAction>
            {typeof variant.trendLastHour === "number" ? (
              <Badge variant="outline">
                {variant.trendLastHour >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                {formatPercent(variant.trendLastHour)}
              </Badge>
            ) : null}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {typeof variant.trendLastMonth === "number" ? (
            <div className="line-clamp-1 flex gap-2 font-medium">
              {variant.trendLastMonth >= 0
                ? "Trending up this month"
                : "Trending down this month"}
              {variant.trendLastMonth >= 0 ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <IconTrendingDown className="size-4" />
              )}
            </div>
          ) : null}
          <div className="text-muted-foreground">
            {variant.lowProfit !== undefined
              ? `${formatNumber(variant.lowProfit)} (lowest profit)`
              : "N/A"}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Xp/hr</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {variant.xpHour
              ? formatNumber(
                  variant.xpHour.reduce(
                    (total, { experience }) => total + experience,
                    0
                  )
                )
              : "N/A"}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {(variant.xpHour || []).map(({ skill, experience }) => (
            <Badge size="lg" key={skill} variant="secondary">
              <img
                src={getUrlByType(skill) ?? ""}
                alt={`${skill.toLowerCase()}_icon`}
                title={skill}
              />
              {formatNumber(experience)}
            </Badge>
          ))}
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>AFKiness</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {variant.afkiness !== undefined ? `${variant.afkiness}%` : "N/A"}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <IconClick className="size-4" />
            {variant.clickIntensity ?? "N/A"} clicks/hr
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

function IoItemsGrid({
  title,
  total,
  items,
  itemsMap,
}: {
  title: string;
  total: number;
  items: Variant["inputs"];
  itemsMap: Record<number, Item>;
}) {
  return (
    <div className="flex-1">
      <h3 className="text-sm font-semibold">
        {title}{" "}
        <span className="text-xs font-normal text-muted-foreground">
          ({formatNumber(total)} gp)
        </span>
      </h3>
      <div className="mt-3 min-h-14 w-full rounded bg-[#494034] p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
        <div className="flex flex-start flex-wrap gap-1">
          {items.map((entry) => {
            const item = itemsMap[entry.id];
            if (!item) return null;
            const reasonLabel = entry.reason?.trim();
            return (
              <Tooltip key={`${title}-${entry.id}`}>
                <TooltipTrigger asChild>
                  <div className="relative mx-0.75 grid h-8 w-8 place-items-center">
                    <figure className="grid h-full w-full place-items-center">
                      <img
                        src={item.iconUrl}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain drop-shadow-[1px_1px_0_#333333] [image-rendering:pixelated]"
                      />
                    </figure>

                    {entry.quantity > 0 ? (
                      <span className="osrs-num osrs-num-2x pointer-events-none absolute -top-0.5 -left-0.5 px-0.5">
                        {entry.quantity}
                      </span>
                    ) : null}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {reasonLabel ? (
                      <span className="text-muted-foreground">{reasonLabel}</span>
                    ) : null}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RequirementsAndRecommendationsAccordion({
  variant,
  itemsMap,
}: {
  variant: Variant;
  itemsMap: Record<number, Item>;
}) {
  return (
    <div className="mx-auto w-full px-6 py-8">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <section>
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            Levels and quests
          </h3>

          <div className="mt-6">
            <h3 className="text-sm font-semibold">Requirements</h3>
            <div className="mt-3 min-h-14 w-full rounded bg-gray-300">
              <div className="flex flex-start flex-wrap gap-2">
                <LevelsAndQuestBadges requirement={variant.requirements} />
              </div>
            </div>
          </div>

          {variant.recommendations ? (
            <div className="mt-8">
              <h3 className="text-sm font-semibold">Recommendations</h3>
              <div className="mt-3 min-h-14 w-full rounded bg-gray-300">
                <div className="flex flex-start flex-wrap gap-2">
                  <LevelsAndQuestBadges requirement={variant.recommendations} />
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Items</h3>

          <div className="mt-6">
            <h3 className="text-sm font-semibold">Requirements</h3>
            <div className="mt-3 min-h-14 w-full rounded bg-gray-300">
              <div className="flex flex-start flex-wrap gap-2">
                <ItemRequirementIcons
                  items={variant.requirements?.items}
                  itemsMap={itemsMap}
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold">Recommendations</h3>
            <div className="mt-3 min-h-14 w-full rounded bg-gray-300">
              <div className="flex flex-start flex-wrap gap-2">
                <ItemRequirementIcons
                  items={variant.recommendations?.items}
                  itemsMap={itemsMap}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function MethodVariantContent({
  variant,
  itemsMap,
  username,
  inputsTotal,
  outputsTotal,
}: MethodVariantContentProps) {
  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      <MissingRequirementsNotice variant={variant} username={username} />

      <div className="grid gap-3 lg:grid-cols-12">
        <MetricsCards variant={variant} />

        <div className="order-2 rounded-md border border-gray-300 bg-gray-200 p-4 dark:border-gray-700 dark:bg-gray-800 lg:order-1 lg:col-span-8">
          <Markdown content={variant.description} items={itemsMap} />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <Accordion type="multiple" className="w-full" defaultValue={["item-1"]}>
          <AccordionItem value="item-1">
            <div className="flex min-h-12 flex-col rounded-md border border-gray-300 bg-gray-200 px-4 dark:border-gray-700 dark:bg-gray-800">
              <AccordionTrigger>Inputs & Outputs</AccordionTrigger>
              <AccordionContent className="flex gap-4 text-balance">
                <IoItemsGrid
                  title="Inputs"
                  total={inputsTotal}
                  items={variant.inputs}
                  itemsMap={itemsMap}
                />
                <IoItemsGrid
                  title="Outputs"
                  total={outputsTotal}
                  items={variant.outputs}
                  itemsMap={itemsMap}
                />
              </AccordionContent>
            </div>
          </AccordionItem>

          <AccordionItem value="item-2">
            <div className="flex min-h-12 flex-col rounded-md border border-gray-300 bg-gray-200 px-4 dark:border-gray-700 dark:bg-gray-800">
              <AccordionTrigger>Requirements & Recommendations</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 text-balance">
                <RequirementsAndRecommendationsAccordion
                  variant={variant}
                  itemsMap={itemsMap}
                />
              </AccordionContent>
            </div>
          </AccordionItem>
        </Accordion>
      </div>

      {variant.id ? (
        <Suspense
          fallback={
            <div className="mt-4 text-sm text-muted-foreground">Loading chart...</div>
          }
        >
          <LazyVariantHistoryChart
            variantId={variant.id}
            trendLastHour={variant.trendLastHour}
            trendLast24h={variant.trendLast24h}
            trendLastWeek={variant.trendLastWeek}
            trendLastMonth={variant.trendLastMonth}
            trendLastYear={variant.trendLastYear}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
