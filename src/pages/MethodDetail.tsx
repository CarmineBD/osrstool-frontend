import { useMemo, useEffect } from "react";
import {
  fetchItems,
  fetchMethodDetail,
  fetchMethods,
  type Variant,
  type MethodDetailResponse,
  type MethodsResponse,
} from "../lib/api";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getUrlByType, formatNumber, formatPercent } from "@/lib/utils";
import Markdown from "@/components/Markdown";
import { useQuery } from "@tanstack/react-query";
import { useUsername } from "@/contexts/UsernameContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTrendingUp, IconTrendingDown, IconClick } from "@tabler/icons-react";
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
import VariantHistoryChart from "@/components/VariantHistoryChart";

export type Props = Record<string, never>;

export function MethodDetail(_props: Props) {
  void _props;
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: methodParam = "", variantSlug } = useParams<{
    slug: string;
    variantSlug?: string;
  }>();
  const state = location.state as { methodId?: string } | undefined;
  const { username, setUserError } = useUsername();

  const isNumericId = /^\d+$/.test(methodParam);

  const { data: methodsData, isLoading: isLoadingMethods } =
    useQuery<MethodsResponse>({
      queryKey: ["methods", username],
      queryFn: () => fetchMethods(username),
      enabled: !state?.methodId && !isNumericId,
    });

  const methodId =
    state?.methodId ??
    (isNumericId
      ? methodParam
      : methodsData?.methods.find((m) => m.slug === methodParam)?.id);

  const {
    data,
    error,
    isLoading: isLoadingDetail,
  } = useQuery<MethodDetailResponse, Error>({
    queryKey: ["methodDetail", methodId, username],
    queryFn: () => fetchMethodDetail(methodId!, username),
    enabled: !!methodId,
    retry: false,
  });

  useEffect(() => {
    const warning = data?.warnings?.[0];
    setUserError(warning?.message ?? null);
  }, [data, setUserError]);

  useEffect(() => {
    if (error) {
      setUserError("Failed to fetch user");
    }
  }, [error, setUserError]);

  const method = data?.method;

  const itemIds = useMemo(() => {
    if (!method) return [] as number[];
    const ids = new Set<number>();
    method.variants.forEach((variant: Variant) => {
      variant.inputs.forEach((i) => ids.add(i.id));
      variant.outputs.forEach((o) => ids.add(o.id));
      variant.requirements.items?.forEach((i) => ids.add(i.id));
      variant.recommendations?.items?.forEach((i) => ids.add(i.id));
    });
    return Array.from(ids);
  }, [method]);

  const { data: itemsData } = useQuery({
    queryKey: ["items", itemIds],
    queryFn: () => fetchItems(itemIds),
    enabled: itemIds.length > 0,
  });

  if (isLoadingMethods || isLoadingDetail) return <p>Cargando método…</p>;
  if (error) return <p className="text-red-500">❌ {`${error}`}</p>;
  if (!method) return <p>No se encontró el método.</p>;
  const itemsMap = itemsData || {};
  const firstTabSlug =
    method.variants[0]?.slug ?? (method.variants[0]?.id ?? 0).toString();
  const activeSlug = variantSlug ?? firstTabSlug;
  const hasMultiple = (method?.variants?.length ?? 0) > 1;
  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded shadow">
      {!username && (
        <p className="mb-4 text-sm text-gray-500">
          Please enter your username to fetch your user data.
        </p>
      )}
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {method.name}
      </h1>
      <Markdown content={method.description} items={itemsMap} />
      <div className="mb-4">
        <span className="font-semibold">Category:</span> {method.category}
      </div>
      {hasMultiple && <h3 className="font-semibold mb-2">Variants:</h3>}

      <Tabs
        value={activeSlug}
        onValueChange={(v) =>
          navigate(
            `/moneyMakingMethod/${methodParam}${
              hasMultiple ? `/${v}` : ""
            }`,
            { state: { methodId: method.id } }
          )
        }
        className="w-full"
      >
        {hasMultiple && (
          <TabsList>
            {method.variants.map((variant: Variant, index: number) => (
              <TabsTrigger
                key={variant.slug ?? variant.id ?? index.toString()}
                value={
                  variant.slug ?? (variant.id ?? index.toString()).toString()
                }
              >
                {variant.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {method.variants.map((variant: Variant, index: number) => (
          <TabsContent
            key={variant.slug ?? variant.id ?? index.toString()}
            value={
              variant.slug ?? (variant.id ?? index.toString()).toString()
            }
            className="p-4"
          >
            {/* <div className="mb-2">
              <span className="font-semibold">AFKiness:</span>{" "}
              {variant.afkiness}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Click Intensity:</span>{" "}
              {variant.clickIntensity}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Risk Level:</span>{" "}
              {variant.riskLevel}
            </div>
            <div className="mb-2">
              <span className="font-semibold">XP/H:</span>{" "}
              {Object.entries(variant.xpHour)
                .map(([skill, xp]) => `${skill}: ${xp} XP`)
                .join(", ")}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Requisitos:</span>
              <ul className="list-disc pl-5">
                {Object.entries(variant.requirements.levels).map(
                  ([skill, level]) => (
                    <li key={skill}>
                      {skill}: {level}
                    </li>
                  )
                )}
                {variant.requirements.items?.length > 0 && (
                  <li>
                    Items:{" "}
                    {variant.requirements.items
                      .map((item) => `${item.id} x${item.quantity}`)
                      .join(", ")}
                  </li>
                )}
              </ul>
            </div>
            <div className="mb-2">
              <span className="font-semibold">High Profit:</span>{" "}
              {variant.highProfit}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Low Profit:</span>{" "}
              {variant.lowProfit}
            </div> */}
            <div className="mx-auto max-w-6xl p-4 lg:p-6">
              {/* missingRequirements */}
              <div className="mb-4 rounded-md border border-gray-300 bg-gray-200 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
                {variant.missingRequirements ? (
                  <>
                    <p className="text-red-600 mb-4">
                      You are missing some requirements to do this method:
                    </p>
                    <div className="flex flex-start flex-wrap gap-2">
                      {(variant.missingRequirements?.levels || []).map(
                        ({ skill, level }) => (
                          <Badge size="lg" key={skill} variant="secondary">
                            <img
                              src={getUrlByType(skill) ?? ""}
                              alt={`${skill.toLowerCase()}_icon`}
                              title={`${skill}`}
                            />
                            {level}
                          </Badge>
                        )
                      )}
                      {(variant.missingRequirements?.quests || []).map(
                        ({ name, stage }) => (
                          <Badge size="lg" key={name} variant="secondary">
                            <img
                              src={getUrlByType("quests") ?? ""}
                              alt={`quests_icon`}
                              title="quests"
                            />
                            {stage === 1 ? name : `${name} (started)`}
                          </Badge>
                        )
                      )}
                      {(
                        variant.missingRequirements?.achievement_diaries || []
                      ).map(({ name, tier }) => (
                        <Badge
                          size="lg"
                          key={`${name}_${tier}`}
                          variant="secondary"
                        >
                          <img
                            src={getUrlByType("achivement_diaries") ?? ""}
                            alt={`achivements_diaries_icon`}
                            title="quests"
                          />
                          {`${name} ${tier}`}
                        </Badge>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-green-600">All requirements met! 🎉</p>
                )}
              </div>

              {/* Bloque responsive: métricas (mobile arriba) + descripción (desktop izquierda) */}
              <div className="grid gap-3 lg:grid-cols-12">
                {/* Métricas: mobile primero, desktop a la derecha */}
                {/* <div className="order-1 flex flex-col gap-2 lg:order-2 lg:col-span-4">
                  <div className="h-12 rounded-md border border-gray-300 bg-gray-200 px-4 dark:border-gray-700 dark:bg-gray-800"></div>
                  <div className="h-12 rounded-md border border-gray-300 bg-gray-200 px-4 dark:border-gray-700 dark:bg-gray-800"></div>
                  <div className="h-12 rounded-md border border-gray-300 bg-gray-200 px-4 dark:border-gray-700 dark:bg-gray-800"></div>
                </div> */}
                <div className="order-1 flex flex-col gap-2 lg:order-2 lg:col-span-4">
                  <Card className="@container/card">
                    <CardHeader>
                      <CardDescription>Gp/hr</CardDescription>
                      <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl flex gap-3">
                        <figure>
                          <img
                            src={
                              "https://oldschool.runescape.wiki/images/Coins_10000.png"
                            }
                            alt={"Coins"}
                            title={"Coins"}
                          />
                        </figure>

                        {variant.highProfit !== undefined
                          ? formatNumber(variant.highProfit)
                          : "N/A"}
                      </CardTitle>
                      <CardAction>
                        {typeof variant.trendLastHour === "number" && (
                          <Badge variant="outline">
                            {variant.trendLastHour >= 0 ? (
                              <IconTrendingUp />
                            ) : (
                              <IconTrendingDown />
                            )}
                            {formatPercent(variant.trendLastHour)}
                          </Badge>
                        )}
                      </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                      {typeof variant.trendLastMonth === "number" && (
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
                      )}
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
                      <CardAction>
                        {/* <Badge variant="outline">
        <IconTrendingDown />
        -20%
      </Badge> */}
                      </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                      {(variant.xpHour || []).map(({ skill, experience }) => (
                        <Badge size="lg" key={skill} variant="secondary">
                          <img
                            src={getUrlByType(skill) ?? ""}
                            alt={`${skill.toLowerCase()}_icon`}
                            title={`${skill}`}
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
                        {variant.afkiness ? variant.afkiness : "N/A"}
                      </CardTitle>
                      <CardAction>
                        {/* <Badge variant="outline">
                          <IconTrendingDown />
                          -20%
                        </Badge> */}
                      </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                      <div className="line-clamp-1 flex gap-2 font-medium">
                        <IconClick className="size-4" />
                        {variant.clickIntensity ?? "N/A"} clicks/hr
                      </div>
                      {/* <div className="text-muted-foreground">
                        Acquisition needs attention
                      </div> */}
                    </CardFooter>
                  </Card>
                </div>

                {/* Descripción: mobile debajo, desktop a la izquierda */}
                <div className="order-2 rounded-md border border-gray-300 bg-gray-200 p-4 dark:border-gray-700 dark:bg-gray-800 lg:order-1 lg:col-span-8">
                  <Markdown content={variant.description} items={itemsMap} />
                </div>
              </div>

              {/* Acordeones (placeholders) */}
              <div className="mt-3 space-y-2">
                <Accordion
                  type="multiple"
                  className="w-full"
                  defaultValue={["item-1"]} // opcional: abre varias por defecto p.ej. ["item-1","item-2"]
                >
                  <AccordionItem value="item-1">
                    <div className="min-h-12 rounded-md border border-gray-300 bg-gray-200 px-4 dark:border-gray-700 dark:bg-gray-800 flex flex-col">
                      <AccordionTrigger>Inputs & Outputs</AccordionTrigger>
                      <AccordionContent className="flex gap-4 text-balance">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold">Inputs</h3>
                          <div className="mt-3 min-h-14 w-full rounded bg-[#494034] p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
                            <div className="flex flex-start flex-wrap gap-1">
                              {variant.inputs.map((input) => {
                                const item = itemsMap[input.id];
                                if (!item) return null;
                                return (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        key={input.id}
                                        className="relative mx-0.75 w-8 h-8 grid place-items-center" /* 32x32 */
                                      >
                                        <figure className="w-full h-full grid place-items-center">
                                          <img
                                            src={item.iconUrl}
                                            alt={item.name}
                                            className="max-w-full max-h-full object-contain drop-shadow-[1px_1px_0_#333333] [image-rendering:pixelated]"
                                          />
                                        </figure>

                                        {input.quantity > 0 && (
                                          <span className="osrs-num osrs-num-2x absolute -top-0.5 -left-0.5 px-0.5 pointer-events-none">
                                            {input.quantity}
                                          </span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{item.name}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold">Outputs</h3>
                          <div className="mt-3 min-h-14 w-full rounded bg-[#494034] p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
                            <div className="flex flex-start flex-wrap gap-1">
                              {variant.outputs.map((output) => {
                                const item = itemsMap[output.id];
                                if (!item) return null;
                                return (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        key={output.id}
                                        className="relative mx-0.75 w-8 h-8 grid place-items-center" /* 32x32 */
                                      >
                                        <figure className="w-full h-full grid place-items-center">
                                          <img
                                            src={item.iconUrl}
                                            alt={item.name}
                                            className="max-w-full max-h-full object-contain drop-shadow-[1px_1px_0_#333333] [image-rendering:pixelated]"
                                          />
                                        </figure>

                                        {output.quantity > 0 && (
                                          <span className="osrs-num osrs-num-2x absolute -top-0.5 -left-0.5 px-0.5 pointer-events-none">
                                            {output.quantity}
                                          </span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{item.name}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </div>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <div className="min-h-12 rounded-md border border-gray-300 bg-gray-200 px-4 dark:border-gray-700 dark:bg-gray-800 flex flex-col">
                      <AccordionTrigger>
                        Requirements & Recommendations
                      </AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-4 text-balance">
                        <div className="mx-auto w-full px-6 py-8">
                          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                            {/* Columna 1 — Levels and quests */}
                            <section>
                              <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                                Levels and quests
                              </h3>

                              <div className="mt-6">
                                <h3 className="text-sm font-semibold">
                                  Requirements
                                </h3>
                                <div className="mt-3 min-h-14 w-full rounded bg-gray-300">
                                  <div className="flex flex-start flex-wrap gap-2">
                                    {(variant.requirements?.levels || []).map(
                                      ({ skill, level }) => (
                                        <Badge
                                          size="lg"
                                          key={skill}
                                          variant="secondary"
                                        >
                                          <img
                                            src={getUrlByType(skill) ?? ""}
                                            alt={`${skill.toLowerCase()}_icon`}
                                            title={`${skill}`}
                                          />
                                          {level}
                                        </Badge>
                                      )
                                    )}
                                    {(variant.requirements?.quests || []).map(
                                      ({ name, stage }) => (
                                        <Badge
                                          size="lg"
                                          key={name}
                                          variant="secondary"
                                        >
                                          <img
                                            src={getUrlByType("quests") ?? ""}
                                            alt={`quests_icon`}
                                            title="quests"
                                          />
                                          {stage === 1
                                            ? name
                                            : `${name} (started)`}
                                        </Badge>
                                      )
                                    )}
                                    {(
                                      variant.requirements
                                        ?.achievement_diaries || []
                                    ).map(({ name, tier }) => (
                                      <Badge
                                        size="lg"
                                        key={`${name}_${tier}`}
                                        variant="secondary"
                                      >
                                        <img
                                          src={
                                            getUrlByType(
                                              "achivement_diaries"
                                            ) ?? ""
                                          }
                                          alt={`achivements_diaries_icon`}
                                          title="quests"
                                        />
                                        {`${name} ${tier}`}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              {variant.recommendations && (
                                <div className="mt-8">
                                  <h3 className="text-sm font-semibold">
                                    Recommendations
                                  </h3>
                                  <div className="mt-3 min-h-14 w-full rounded bg-gray-300">
                                    <div className="flex flex-start flex-wrap gap-2">
                                      {(
                                        variant.recommendations?.levels || []
                                      ).map(({ skill, level }) => (
                                        <Badge
                                          size="lg"
                                          key={skill}
                                          variant="secondary"
                                        >
                                          <img
                                            src={getUrlByType(skill) ?? ""}
                                            alt={`${skill.toLowerCase()}_icon`}
                                            title={`${skill}`}
                                          />
                                          {level}
                                        </Badge>
                                      ))}
                                      {(
                                        variant.recommendations?.quests || []
                                      ).map(({ name, stage }) => (
                                        <Badge
                                          size="lg"
                                          key={name}
                                          variant="secondary"
                                        >
                                          <img
                                            src={getUrlByType("quests") ?? ""}
                                            alt={`quests_icon`}
                                            title="quests"
                                          />
                                          {stage === 1
                                            ? name
                                            : `${name} (started)`}
                                        </Badge>
                                      ))}
                                      {(
                                        variant.recommendations
                                          ?.achievement_diaries || []
                                      ).map(({ name, tier }) => (
                                        <Badge
                                          size="lg"
                                          key={`${name}_${tier}`}
                                          variant="secondary"
                                        >
                                          <img
                                            src={
                                              getUrlByType(
                                                "achivement_diaries"
                                              ) ?? ""
                                            }
                                            alt={`achivements_diaries_icon`}
                                            title="quests"
                                          />
                                          {`${name} ${tier}`}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </section>

                            {/* Columna 2 — Items */}
                            <section>
                              <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                                Items
                              </h3>

                              <div className="mt-6">
                                <h3 className="text-sm font-semibold">
                                  Requirements
                                </h3>
                                <div className="mt-3 min-h-14 w-full rounded bg-gray-300">
                                  <div className="flex flex-start flex-wrap gap-2">
                                    {(variant.requirements?.items || []).map(
                                      ({ id, quantity }) => {
                                        const item = itemsMap[id];
                                        if (!item) return null;
                                        return (
                                          <div key={id} className="relative">
                                            <img
                                              src={item.iconUrl}
                                              alt={item.name}
                                              title={item.name}
                                            />
                                            {quantity > 1 && (
                                              <span className="absolute -top-1 -right-1 rounded bg-black/70 px-1 text-xs text-white">
                                                {quantity}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-8">
                                <h3 className="text-sm font-semibold">
                                  Recommendations
                                </h3>
                                <div className="mt-3 min-h-14 w-full rounded bg-gray-300">
                                  <div className="flex flex-start flex-wrap gap-2">
                                    {(variant.recommendations?.items || []).map(
                                      ({ id, quantity }) => {
                                        const item = itemsMap[id];
                                        if (!item) return null;
                                        return (
                                          <div key={id} className="relative">
                                            <img
                                              src={item.iconUrl}
                                              alt={item.name}
                                              title={item.name}
                                            />
                                            {quantity > 1 && (
                                              <span className="absolute -top-1 -right-1 rounded bg-black/70 px-1 text-xs text-white">
                                                {quantity}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              </div>
                            </section>
                          </div>
                        </div>
                      </AccordionContent>
                    </div>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Gráfico */}
              {variant.id && (
                <VariantHistoryChart
                  variantId={variant.id}
                  trendLastHour={variant.trendLastHour}
                  trendLast24h={variant.trendLast24h}
                  trendLastWeek={variant.trendLastWeek}
                  trendLastMonth={variant.trendLastMonth}
                  trendLastYear={variant.trendLastYear}
                />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
