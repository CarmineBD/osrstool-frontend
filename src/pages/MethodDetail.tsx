import type { Variant } from "../lib/api";
import { useParams } from "react-router-dom";
import { getUrlByType } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
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
import { IconTrendingUp, IconClick } from "@tabler/icons-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

async function fetchMethodDetail(id: string) {
  const url = `${import.meta.env.VITE_API_URL}/methods/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} – Error fetching method`);
  const json = await res.json();
  return json.data;
}

export function MethodDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading } = useQuery({
    queryKey: ["methodDetail", id],
    queryFn: () => fetchMethodDetail(id!),
    enabled: !!id,
  });

  if (isLoading) return <p>Cargando método…</p>;
  if (error) return <p className="text-red-500">❌ {`${error}`}</p>;
  if (!data) return <p>No se encontró el método.</p>;

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded shadow">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {data.name}
      </h1>
      <p className="mb-2">{data.description}</p>
      <div className="mb-4">
        <span className="font-semibold">Categoría:</span> {data.category}
      </div>
      <h3 className="font-semibold mb-2">Variantes:</h3>

      <Tabs className="w-full">
        <TabsList>
          {data.variants.map((variant: Variant, index: number) => (
            <TabsTrigger
              key={variant.id ?? index.toString()}
              value={variant.id ?? index.toString()}
            >
              {variant.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {data.variants.map((variant: Variant, index: number) => (
          <TabsContent
            key={variant.id ?? index.toString()}
            value={variant.id ?? index.toString()}
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
                {variant.missingRequirements?.length ? (
                  <ul className="list-disc pl-5">
                    {variant.missingRequirements.map((req) => (
                      <li key={req.id}>
                        {req.name} (Nivel: {req.level})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-green-600">
                    Todos los requisitos cumplidos
                  </p>
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
                      <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {variant.highProfit}
                      </CardTitle>
                      <CardAction>
                        <Badge variant="outline">
                          <IconTrendingUp />
                          +12.5%
                        </Badge>
                      </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                      <div className="line-clamp-1 flex gap-2 font-medium">
                        Trending up this month
                        <IconTrendingUp className="size-4" />
                      </div>
                      <div className="text-muted-foreground">
                        Visitors for the last 6 months
                      </div>
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
                  <Card className="@container/card">
                    <CardHeader>
                      <CardDescription>Xp/hr</CardDescription>
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
                      {/* <div className="line-clamp-1 flex gap-2 font-medium">
                        <IconClick className="size-4" />
                        {variant.clickIntensity} clicks/hr
                      </div> */}
                      {/* <div className="text-muted-foreground">
                        Acquisition needs attention
                      </div> */}
                    </CardFooter>
                  </Card>
                </div>

                {/* Descripción: mobile debajo, desktop a la izquierda */}
                <div className="order-2 rounded-md border border-gray-300 bg-gray-200 p-4 dark:border-gray-700 dark:bg-gray-800 lg:order-1 lg:col-span-8">
                  {variant.description}
                </div>
              </div>

              {/* Acordeones (placeholders) */}
              <div className="mt-3 space-y-2">
                <Accordion
                  type="single"
                  collapsible
                  className="w-full"
                  defaultValue="item-1"
                >
                  <AccordionItem value="item-1">
                    <div className="min-h-12 rounded-md border border-gray-300 bg-gray-200 px-4 dark:border-gray-700 dark:bg-gray-800 flex flex-col">
                      <AccordionTrigger>Inputs & Outputs</AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-4 text-balance">
                        {variant.inputs.map((input) => (
                          <li key={input.id}>
                            {input.id} (x{input.quantity})
                          </li>
                        ))}
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
                                <div className="mt-3 min-h-14 w-full rounded bg-gray-300"></div>
                              </div>

                              <div className="mt-8">
                                <h3 className="text-sm font-semibold">
                                  Recommendations
                                </h3>
                                <div className="mt-3 min-h-14 w-full rounded bg-gray-300"></div>
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
              <div className="mt-4 rounded-md border border-gray-300 bg-gray-200 p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="h-56 sm:h-64 lg:h-72" />
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
