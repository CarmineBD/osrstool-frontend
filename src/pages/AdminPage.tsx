import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatabaseZap, RefreshCw, ShieldCheck } from "lucide-react";
import { AdminPresenceHistoryCard } from "@/components/AdminPresenceHistoryCard";
import { AdminFeedbackSection } from "@/components/AdminFeedbackSection";
import {
  formatOsrsItemQuantity,
  OsrsItemSprite,
  OSRS_ITEM_TRAY_CLASS,
} from "@/components/OsrsItemTray";
import { useAuth } from "@/auth/AuthProvider";
import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_CARD_CONTENT_CLASS,
  EDITOR_CARD_HEADER_CLASS,
  EDITOR_META_TEXT_CLASS,
  EDITOR_NESTED_SURFACE_CLASS,
  EDITOR_PRIMARY_CARD_CLASS,
  EDITOR_SECONDARY_CARD_CLASS,
  EDITOR_SECTION_CARD_CLASS,
  EDITOR_TABLE_HEADER_CLASS,
  EDITOR_TABLE_SURFACE_CLASS,
  EmptySelectionState,
  PixelArtIcon,
  SectionHeader,
} from "@/components/method-editor/MethodEditorPrimitives";
import {
  Alert,
  AlertDescription,
  AlertPresence,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminLatestCatalogItem,
  AdminLatestCatalogQuest,
  AdminExecutionStatus,
  AdminItemsSyncInput,
  AdminPresenceHistoryRange,
  AdminScriptExecution,
} from "@/lib/admin";
import {
  fetchAdminJobs,
  fetchAdminOverview,
  fetchAdminPresenceHistory,
  refreshAdminMethodProfits,
  runAdminItemsSync,
} from "@/lib/admin";
import { fetchMe, getMeQueryKey } from "@/lib/me";
import { formatSkillName, OSRS_SKILLS } from "@/lib/skills";
import { getUrlByType } from "@/lib/utils";
import {
  QUERY_REFETCH_INTERVAL_MS,
  QUERY_STALE_TIME_MS,
} from "@/lib/queryRefresh";
import {
  ADMIN_SCRIPT_NAME_MAX_LENGTH,
  normalizeBoundedText,
} from "@/lib/validation";

const numberFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});
const dateOnlyFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const JOB_LIMIT_OPTIONS = [10, 20, 50] as const;
const ITEM_SYNC_SCRIPT_PREFIX = "items:";
const METHOD_REFRESH_SCRIPT_NAME = "method-profits:refresh";

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "Pending";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function formatDate(value: string | null) {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateOnlyFormatter.format(date);
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) return "Running";
  if (durationMs < 1_000) return `${durationMs} ms`;
  if (durationMs < 60_000) return `${(durationMs / 1_000).toFixed(1)} s`;

  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.round((durationMs % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

function statusBadgeVariant(status: AdminExecutionStatus) {
  if (status === "succeeded") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

function formatExecutionDetails(execution: AdminScriptExecution) {
  if (execution.errorMessage) return execution.errorMessage;
  if (execution.result) return JSON.stringify(execution.result);
  if (execution.params) return `params ${JSON.stringify(execution.params)}`;
  return "No details";
}

function buildActionSummary(execution: AdminScriptExecution) {
  const base = `${execution.scriptName} (${execution.status})`;
  if (execution.errorMessage) return `${base}: ${execution.errorMessage}`;
  if (execution.result) return `${base}: ${JSON.stringify(execution.result)}`;
  return base;
}

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatRelativeElapsed(value: string | null, now = new Date()) {
  if (!value) return "No manual execution has run yet.";

  const startedAt = new Date(value);
  if (Number.isNaN(startedAt.getTime())) return "Unknown execution time.";

  const diffMs = Math.max(0, now.getTime() - startedAt.getTime());
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const monthMs = 30 * dayMs;
  const yearMs = 365 * dayMs;

  const units = [
    { label: ["year", "years"] as const, ms: yearMs },
    { label: ["month", "months"] as const, ms: monthMs },
    { label: ["day", "days"] as const, ms: dayMs },
    { label: ["hour", "hours"] as const, ms: hourMs },
    { label: ["minute", "minutes"] as const, ms: minuteMs },
  ];

  let remainder = diffMs;
  const parts: string[] = [];

  for (const unit of units) {
    if (parts.length === 3) break;

    const amount = Math.floor(remainder / unit.ms);
    if (amount <= 0) continue;

    parts.push(pluralize(amount, unit.label[0], unit.label[1]));
    remainder -= amount * unit.ms;
  }

  if (!parts.length) {
    return "less than 1 minute ago";
  }

  if (parts.length === 1) {
    return `${parts[0]} ago`;
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]} ago`;
  }

  return `${parts[0]}, ${parts[1]} and ${parts[2]} ago`;
}

function executionTimestamp(execution: AdminScriptExecution) {
  const candidates = [
    execution.startedAt,
    execution.finishedAt,
    execution.updatedAt,
    execution.createdAt,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const timestamp = new Date(candidate).getTime();
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return -1;
}

function findLatestExecution(
  executions: AdminScriptExecution[],
  matcher: (execution: AdminScriptExecution) => boolean,
) {
  return executions
    .filter(matcher)
    .sort(
      (left, right) => executionTimestamp(right) - executionTimestamp(left),
    )[0];
}

function buildLastExecutionMessage(
  execution: AdminScriptExecution | undefined,
  emptyMessage: string,
) {
  if (!execution) return emptyMessage;

  const status =
    execution.status === "succeeded"
      ? "Succeeded"
      : execution.status === "failed"
        ? "Failed"
        : "Running";

  return `${status}. Last run ${formatRelativeElapsed(execution.startedAt)}.`;
}

type StatCardProps = {
  label: string;
  value: number | string;
  helper: string;
  detail?: string;
  action?: React.ReactNode;
};

function StatCard({ label, value, helper, detail, action }: StatCardProps) {
  return (
    <div className={`${EDITOR_SECTION_CARD_CLASS} justify-between`}>
      <div className="space-y-3">
        <p className="text-sm font-medium leading-5 text-foreground">{label}</p>
        <p className="text-3xl font-semibold leading-9 tracking-tight text-foreground">
          {typeof value === "number" ? formatCount(value) : value}
        </p>
        <p className={EDITOR_BODY_TEXT_CLASS}>{helper}</p>
        {detail ? <p className={EDITOR_META_TEXT_CLASS}>{detail}</p> : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

type ExecutionTableProps = {
  executions: AdminScriptExecution[];
  emptyDescription: string;
};

function ExecutionTable({ executions, emptyDescription }: ExecutionTableProps) {
  if (!executions.length) {
    return <EmptySelectionState description={emptyDescription} />;
  }

  return (
    <div className={EDITOR_TABLE_SURFACE_CLASS}>
      <Table>
        <TableHeader className={EDITOR_TABLE_HEADER_CLASS}>
          <TableRow>
            <TableHead>Script</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {executions.map((execution) => (
            <TableRow key={execution.id}>
              <TableCell className="font-medium">
                {execution.scriptName}
              </TableCell>
              <TableCell>
                <Badge
                  variant={statusBadgeVariant(execution.status)}
                  size="sm"
                  className="capitalize"
                >
                  {execution.status}
                </Badge>
              </TableCell>
              <TableCell>{formatDateTime(execution.startedAt)}</TableCell>
              <TableCell>{formatDuration(execution.durationMs)}</TableCell>
              <TableCell
                className="max-w-[340px] truncate text-muted-foreground"
                title={formatExecutionDetails(execution)}
              >
                {formatExecutionDetails(execution)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type VariantSkillRow = {
  skill: string;
  count: number;
};

type VariantSkillsTableProps = {
  rows: VariantSkillRow[];
};

function VariantSkillsTable({ rows }: VariantSkillsTableProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {rows.map((row) => (
        <div
          key={row.skill}
          className="inline-flex min-h-11 items-center gap-3 rounded-full border border-border/70 bg-muted/20 px-3 py-2"
        >
          <PixelArtIcon
            src={getUrlByType(row.skill)}
            alt={`${row.skill}_icon`}
            title={formatSkillName(row.skill)}
            size="md"
          />
          <span className="text-sm font-medium leading-5 text-foreground">
            {formatSkillName(row.skill)}
          </span>
          <span className={EDITOR_META_TEXT_CLASS}>
            {formatCount(row.count)} variants
          </span>
        </div>
      ))}
    </div>
  );
}

type LatestCatalogItemsTrayProps = {
  items: AdminLatestCatalogItem[];
  isLoading?: boolean;
};

function LatestCatalogItemsTray({
  items,
  isLoading = false,
}: LatestCatalogItemsTrayProps) {
  return (
    <section className={`${EDITOR_NESTED_SURFACE_CLASS} space-y-4 p-4`}>
      <SectionHeader
        title="Last 100 items added"
        description="Same OSRS item tray as method detail inputs and outputs, using the latest overview snapshot."
        level="h3"
      />

      {!items.length && !isLoading ? (
        <EmptySelectionState description="No recent items were returned by GET /admin/overview." />
      ) : (
        <div className={OSRS_ITEM_TRAY_CLASS}>
          <div className="flex flex-wrap gap-2">
            {isLoading
              ? Array.from({ length: 16 }, (_, index) => (
                  <Skeleton
                    key={`latest-item-skeleton-${index}`}
                    className="h-8 w-8 rounded-sm bg-muted/70"
                  />
                ))
              : items.map((item) => (
                  <Tooltip key={`${item.id}-${item.addedAt}`}>
                    <TooltipTrigger asChild>
                      <OsrsItemSprite
                        iconUrl={item.iconUrl}
                        itemName={item.name}
                        quantity={0}
                        quantityDisplay={formatOsrsItemQuantity(0)}
                      />
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      <div className="flex flex-col gap-1">
                        <span>{item.name}</span>
                        <span className={EDITOR_META_TEXT_CLASS}>
                          Added {formatDate(item.addedAt)}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
          </div>
        </div>
      )}
    </section>
  );
}

type LatestCatalogQuestsListProps = {
  quests: AdminLatestCatalogQuest[];
  isLoading?: boolean;
};

function LatestCatalogQuestsList({
  quests,
  isLoading = false,
}: LatestCatalogQuestsListProps) {
  const questIconUrl = getUrlByType("quests");

  return (
    <section className={`${EDITOR_NESTED_SURFACE_CLASS} space-y-4 p-4`}>
      <SectionHeader
        title="Last 5 quests added"
        description="Latest quest entries returned by the admin overview endpoint."
        level="h3"
      />

      {!quests.length && !isLoading ? (
        <EmptySelectionState description="No recent quests were returned by GET /admin/overview." />
      ) : (
        <div className="space-y-1">
          {isLoading
            ? Array.from({ length: 5 }, (_, index) => (
                <div
                  key={`latest-quest-skeleton-${index}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-3"
                >
                  <Skeleton className="h-[30px] w-[30px] rounded-sm" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ))
            : quests.map((quest) => (
                <div
                  key={`${quest.slug}-${quest.addedAt}`}
                  className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-border/60 hover:bg-background/60"
                >
                  <PixelArtIcon
                    src={questIconUrl}
                    alt="quests_icon"
                    title={quest.name}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-5 text-foreground">
                      {quest.name}
                    </p>
                    <p className={EDITOR_META_TEXT_CLASS}>
                      Added {formatDate(quest.addedAt)}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      )}
    </section>
  );
}

export function AdminPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [jobsLimit, setJobsLimit] = useState<number>(20);
  const [scriptNameInput, setScriptNameInput] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [presenceHistoryRange, setPresenceHistoryRange] =
    useState<AdminPresenceHistoryRange>("72h");
  const deferredScriptName = useDeferredValue(scriptNameInput.trim());

  const { data: meData } = useQuery({
    queryKey: getMeQueryKey(session?.user?.id),
    queryFn: fetchMe,
    enabled: !!session,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });

  const overviewQuery = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: fetchAdminOverview,
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
    retry: false,
  });

  const jobsQuery = useQuery({
    queryKey: ["admin", "jobs", jobsLimit, deferredScriptName],
    queryFn: () =>
      fetchAdminJobs({
        limit: jobsLimit,
        scriptName: deferredScriptName || undefined,
      }),
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
    retry: false,
  });
  const presenceHistoryQuery = useQuery({
    queryKey: ["admin", "presenceHistory", presenceHistoryRange],
    queryFn: () => fetchAdminPresenceHistory(presenceHistoryRange),
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: QUERY_REFETCH_INTERVAL_MS,
    retry: false,
  });

  const refreshAdminQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "presenceHistory"] }),
    ]);
  };

  const itemsSyncMutation = useMutation({
    mutationFn: (input: AdminItemsSyncInput) => runAdminItemsSync(input),
    onSuccess: async (execution) => {
      setActionNotice(buildActionSummary(execution));
      await refreshAdminQueries();
    },
    onError: (error) => {
      setActionNotice(
        error instanceof Error ? error.message : "Error starting items sync",
      );
    },
  });

  const refreshProfitsMutation = useMutation({
    mutationFn: refreshAdminMethodProfits,
    onSuccess: async (execution) => {
      setActionNotice(buildActionSummary(execution));
      await refreshAdminQueries();
    },
    onError: (error) => {
      setActionNotice(
        error instanceof Error
          ? error.message
          : "Error starting method profits refresh",
      );
    },
  });

  const counts = overviewQuery.data?.counts;
  const latestCatalog = overviewQuery.data?.latestCatalog;
  const latestExecutions = useMemo(
    () => overviewQuery.data?.latestExecutions ?? [],
    [overviewQuery.data?.latestExecutions],
  );
  const latestCatalogItems = latestCatalog?.items ?? [];
  const latestCatalogQuests = latestCatalog?.quests ?? [];
  const jobs = jobsQuery.data?.data ?? [];
  const jobMeta = jobsQuery.data?.meta;
  const hasOverviewData = overviewQuery.data !== undefined;
  const isActionPending =
    itemsSyncMutation.isPending || refreshProfitsMutation.isPending;
  const latestItemSyncExecution = useMemo(
    () =>
      findLatestExecution(
        latestExecutions,
        (execution) =>
          execution.scriptName.startsWith(ITEM_SYNC_SCRIPT_PREFIX) &&
          execution.scriptName.endsWith(":sync"),
      ),
    [latestExecutions],
  );
  const latestMethodRefreshExecution = useMemo(
    () =>
      findLatestExecution(
        latestExecutions,
        (execution) => execution.scriptName === METHOD_REFRESH_SCRIPT_NAME,
      ),
    [latestExecutions],
  );
  const variantSkillRows = useMemo(() => {
    const countsBySkill = new Map(
      (counts?.enabledMethodVariantsBySkill ?? []).map((entry) => [
        entry.skill.trim().toLowerCase(),
        entry.variants,
      ]),
    );

    return OSRS_SKILLS.map((skill) => ({
      skill,
      count: countsBySkill.get(skill) ?? 0,
    })).sort(
      (left, right) =>
        right.count - left.count || left.skill.localeCompare(right.skill),
    );
  }, [counts?.enabledMethodVariantsBySkill]);

  const contextRows = useMemo(
    () => [
      {
        label: "Role",
        value: meData?.data?.role ?? "unknown",
      },
      {
        label: "Email",
        value: session?.user?.email ?? "unknown",
      },
      {
        label: "User ID",
        value: session?.user?.id ?? "unknown",
      },
      {
        label: "Jobs filter",
        value: deferredScriptName || "All scripts",
      },
    ],
    [
      deferredScriptName,
      meData?.data?.role,
      session?.user?.email,
      session?.user?.id,
    ],
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className={EDITOR_PRIMARY_CARD_CLASS}>
            <CardHeader className={EDITOR_CARD_HEADER_CLASS}>
              <SectionHeader
                eyebrow="Super admin"
                level="h1"
                title="Admin panel"
                description="Operational summary, latest jobs, and manual admin actions backed by the new super_admin endpoints."
                actions={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void refreshAdminQueries()}
                    disabled={
                      overviewQuery.isFetching ||
                      jobsQuery.isFetching ||
                      presenceHistoryQuery.isFetching
                    }
                  >
                    <RefreshCw className="size-4" />
                    Refresh
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className={EDITOR_CARD_CONTENT_CLASS}>
              <AlertPresence present={Boolean(actionNotice)}>
                <Alert>
                  <ShieldCheck className="size-4" />
                  <AlertTitle>Last admin action</AlertTitle>
                  <AlertDescription>{actionNotice}</AlertDescription>
                </Alert>
              </AlertPresence>

              <AlertPresence present={Boolean(overviewQuery.error)}>
                <Alert variant="destructive">
                  <AlertTitle>Error loading overview</AlertTitle>
                  <AlertDescription>
                    {overviewQuery.error instanceof Error
                      ? overviewQuery.error.message
                      : "Unknown error"}
                  </AlertDescription>
                </Alert>
              </AlertPresence>

              <section className="space-y-4">
                <SectionHeader
                  title="Application overview"
                  description="Basic counters returned by GET /admin/overview."
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {counts ? (
                    <>
                      <StatCard
                        label="Registered users"
                        value={counts.usersRegistered}
                        helper="Total users registered in the platform."
                      />
                      <StatCard
                        label="Items"
                        value={counts.items}
                        helper="Indexed items available for methods and variants."
                        detail={buildLastExecutionMessage(
                          latestItemSyncExecution,
                          "No manual item sync has run yet.",
                        )}
                        action={
                          <Button
                            type="button"
                            onClick={() =>
                              itemsSyncMutation.mutate({
                                source: "mapping",
                                dryRun: false,
                              })
                            }
                            disabled={isActionPending}
                          >
                            <DatabaseZap className="size-4" />
                            {itemsSyncMutation.isPending
                              ? "Starting..."
                              : "Run item sync"}
                          </Button>
                        }
                      />
                      <StatCard
                        label="Quests"
                        value={counts.quests}
                        helper="Quest entries currently exposed by the backend."
                        detail="Quest sync is not implemented yet."
                        action={
                          <Button type="button" variant="outline" disabled>
                            Coming soon
                          </Button>
                        }
                      />
                      <StatCard
                        label="Active sessions"
                        value={counts.activeSessions ?? "Unavailable"}
                        helper="Current live session count from the active presence window."
                        detail={
                          counts.activeSessions === null
                            ? "Redis presence is temporarily unavailable."
                            : "Sourced from the current online presence set."
                        }
                      />
                      <StatCard
                        label="Methods"
                        value={counts.methods.total}
                        helper={`${formatCount(counts.methods.enabled)} enabled / ${formatCount(counts.methods.disabled)} disabled.`}
                        detail={buildLastExecutionMessage(
                          latestMethodRefreshExecution,
                          "No manual method refresh has run yet.",
                        )}
                        action={
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => refreshProfitsMutation.mutate()}
                            disabled={isActionPending}
                          >
                            <RefreshCw className="size-4" />
                            {refreshProfitsMutation.isPending
                              ? "Starting..."
                              : "Refresh profits"}
                          </Button>
                        }
                      />
                      <StatCard
                        label="Variants"
                        value={counts.variants.total}
                        helper={`${formatCount(counts.variants.enabled)} enabled / ${formatCount(counts.variants.disabled)} disabled.`}
                        detail="Variant totals only include the current backend overview snapshot."
                      />
                    </>
                  ) : (
                    Array.from({ length: 6 }, (_, index) => (
                      <Skeleton key={index} className="h-36 rounded-xl" />
                    ))
                  )}
                </div>
              </section>

              <AdminPresenceHistoryCard
                data={presenceHistoryQuery.data}
                error={
                  presenceHistoryQuery.error instanceof Error
                    ? presenceHistoryQuery.error
                    : null
                }
                isLoading={presenceHistoryQuery.isLoading && !presenceHistoryQuery.data}
                range={presenceHistoryRange}
                onRangeChange={setPresenceHistoryRange}
              />

              <AdminFeedbackSection />

              <section className="space-y-4">
                <SectionHeader
                  title="Variant skills"
                  description="All OSRS skills, ordered by how many variants include them. Missing skills are shown as 0."
                />
                {overviewQuery.isLoading && !hasOverviewData ? (
                  <Skeleton className="h-80 rounded-xl" />
                ) : (
                  <VariantSkillsTable rows={variantSkillRows} />
                )}
              </section>

              <section className="space-y-4">
                <SectionHeader
                  title="Latest catalog"
                  description="Recently added catalog entries returned by GET /admin/overview."
                />
                {overviewQuery.isLoading && !hasOverviewData ? (
                  <div className="space-y-4">
                    <Skeleton className="h-40 rounded-xl" />
                    <Skeleton className="h-72 rounded-xl" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <LatestCatalogItemsTray items={latestCatalogItems} />
                    <LatestCatalogQuestsList quests={latestCatalogQuests} />
                  </div>
                )}
              </section>
            </CardContent>
          </Card>

          <Card className={EDITOR_PRIMARY_CARD_CLASS}>
            <CardHeader className={EDITOR_CARD_HEADER_CLASS}>
              <SectionHeader
                title="Jobs history"
                description="Recent executions from GET /admin/jobs, with optional filtering by script name."
              />
            </CardHeader>
            <CardContent className={EDITOR_CARD_CONTENT_CLASS}>
              <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-5 text-foreground">
                    Limit
                  </label>
                  <Select
                    value={String(jobsLimit)}
                    onValueChange={(value) => setJobsLimit(Number(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Limit" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_LIMIT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-5 text-foreground">
                    Script name
                  </label>
                  <Input
                    value={scriptNameInput}
                    maxLength={ADMIN_SCRIPT_NAME_MAX_LENGTH}
                    onChange={(event) =>
                      setScriptNameInput(
                        normalizeBoundedText(
                          event.target.value,
                          ADMIN_SCRIPT_NAME_MAX_LENGTH,
                        ),
                      )
                    }
                    placeholder="items:mapping:sync"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScriptNameInput("")}
                  disabled={!scriptNameInput}
                >
                  Clear filter
                </Button>
              </div>

              <p className={EDITOR_META_TEXT_CLASS}>
                Applied limit: {jobMeta?.limit ?? jobsLimit}. Script filter:{" "}
                {jobMeta?.scriptName ?? "all scripts"}.
              </p>

              <AlertPresence present={Boolean(jobsQuery.error)}>
                <Alert variant="destructive">
                  <AlertTitle>Error loading jobs</AlertTitle>
                  <AlertDescription>
                    {jobsQuery.error instanceof Error
                      ? jobsQuery.error.message
                      : "Unknown error"}
                  </AlertDescription>
                </Alert>
              </AlertPresence>

              {jobsQuery.isLoading && !jobs.length ? (
                <Skeleton className="h-72 rounded-xl" />
              ) : (
                <ExecutionTable
                  executions={jobs}
                  emptyDescription="No jobs matched the current filters."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card className={EDITOR_SECONDARY_CARD_CLASS}>
            <CardHeader className={EDITOR_CARD_HEADER_CLASS}>
              <CardTitle className="text-lg font-semibold leading-6">
                Session context
              </CardTitle>
              <CardDescription>
                Access is gated by GET /me and the `super_admin` role.
              </CardDescription>
            </CardHeader>
            <CardContent className={EDITOR_CARD_CONTENT_CLASS}>
              <div className="space-y-4">
                {contextRows.map((row) => (
                  <div key={row.label} className="space-y-1">
                    <p className="text-sm font-medium leading-5 text-foreground">
                      {row.label}
                    </p>
                    <p className={`${EDITOR_BODY_TEXT_CLASS} break-all`}>
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
