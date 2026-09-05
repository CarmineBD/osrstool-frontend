import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  EDITOR_META_TEXT_CLASS,
  EDITOR_SUBSECTION_TITLE_CLASS,
  EmptySelectionState,
  PixelArtIcon,
} from "@/components/method-editor/MethodEditorPrimitives";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatGameTickCount,
  formatGameTickSeconds,
  isWholeGameTick,
} from "@/lib/gameTicks";
import { getUrlByType } from "@/lib/utils";
import type {
  DynamicActionCondition,
  DynamicActionItem,
  DynamicActionSkillXp,
  Item,
  Variant,
} from "@/lib/api";

function formatQuantity(quantity: number): string {
  return quantity.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatSuccessChance(chance: number | undefined): string {
  if (typeof chance !== "number") return "Always succeeds";
  return `${(chance * 100).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
}

function formatDuration(ticks: number | null | undefined): string {
  if (!isWholeGameTick(ticks)) return "N/A";
  return `${formatGameTickSeconds(ticks)} seconds (${formatGameTickCount(ticks)})`;
}

function DurationValue({ ticks }: { ticks: number | null | undefined }) {
  if (!isWholeGameTick(ticks)) {
    return <span className={EDITOR_META_TEXT_CLASS}>N/A</span>;
  }

  return (
    <span className="flex flex-col gap-1">
      <span className="text-sm font-medium tabular-nums text-foreground">
        {formatGameTickSeconds(ticks)} seconds
      </span>
      <span className={EDITOR_META_TEXT_CLASS}>{formatGameTickCount(ticks)}</span>
    </span>
  );
}

function conditionLabel(condition: DynamicActionCondition | undefined): string {
  switch (condition) {
    case "success":
      return "On success";
    case "failure":
      return "On failure";
    default:
      return "Always";
  }
}

function ActionItemTable({
  entries,
  itemsMap,
  emptyMessage,
}: {
  entries: DynamicActionItem[];
  itemsMap: Record<number, Item>;
  emptyMessage: string;
}) {
  if (entries.length === 0) {
    return <p className={EDITOR_META_TEXT_CLASS}>{emptyMessage}</p>;
  }

  return (
    <Table className="table-fixed">
      <TableHeader className="bg-muted/40 text-foreground">
        <TableRow className="hover:bg-transparent">
          <TableHead>Item</TableHead>
          <TableHead className="w-[96px] text-right">Quantity</TableHead>
          <TableHead className="w-[116px]">When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry, index) => {
          const item = itemsMap[entry.id];
          const itemName = item?.name ?? `Item ${entry.id}`;

          return (
            <TableRow key={`${entry.id}-${entry.condition ?? "always"}-${index}`}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <PixelArtIcon
                    src={item?.iconUrl}
                    alt={itemName}
                    title={itemName}
                    size="native"
                  />
                  <span className="font-medium text-foreground">{itemName}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums text-foreground">
                {formatQuantity(entry.quantity)}
              </TableCell>
              <TableCell>
                <Badge size="sm" variant="secondary">
                  {conditionLabel(entry.condition)}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ActionXpTable({ entries }: { entries: DynamicActionSkillXp[] }) {
  if (entries.length === 0) {
    return <p className={EDITOR_META_TEXT_CLASS}>No experience configured.</p>;
  }

  return (
    <Table className="table-fixed">
      <TableHeader className="bg-muted/40 text-foreground">
        <TableRow className="hover:bg-transparent">
          <TableHead>Skill</TableHead>
          <TableHead className="w-[96px] text-right">Experience</TableHead>
          <TableHead className="w-[116px]">When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry, index) => {
          const skillName = entry.skill ?? `Skill ${entry.skillId}`;

          return (
            <TableRow key={`${entry.skillId}-${entry.condition ?? "always"}-${index}`}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <PixelArtIcon
                    src={getUrlByType(skillName)}
                    alt={`${skillName} icon`}
                    title={skillName}
                    size="sm"
                  />
                  <span className="font-medium capitalize text-foreground">
                    {skillName}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums text-foreground">
                {formatQuantity(entry.experience)}
              </TableCell>
              <TableCell>
                <Badge size="sm" variant="secondary">
                  {conditionLabel(entry.condition)}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function CycleDetails({ variant }: { variant: Variant }) {
  const action = variant.action ?? variant.dynamicAction;
  const steps = [...(variant.cycleSteps ?? [])].sort(
    (first, second) => first.stepOrderPosition - second.stepOrderPosition,
  );

  if (steps.length === 0) {
    return <EmptySelectionState description="No cycle steps are configured for this variant." />;
  }

  return (
    <div className="space-y-4">
      <Table className="table-fixed">
        <TableHeader className="bg-muted/40 text-foreground">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">Step</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-12 text-right">Clicks</TableHead>
            <TableHead className="w-20 text-right">Actions made</TableHead>
            <TableHead className="w-28">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {steps.map((step, index) => {
            const actionsMade = step.actionsMade ?? 0;
            const durationTicks =
              actionsMade > 0 && action
                ? actionsMade * action.rollIntervalTicks
                : step.durationTicks;

            return (
              <TableRow key={step.id ?? `${step.stepOrderPosition}-${index}`}>
                <TableCell className="text-muted-foreground">
                  #{step.stepOrderPosition}
                </TableCell>
                <TableCell className="font-semibold text-foreground" title={step.name}>
                  {step.name}
                </TableCell>
                <TableCell className="text-right tabular-nums text-foreground">
                  {formatQuantity(step.clicksMade)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-foreground">
                  {actionsMade > 0 ? formatQuantity(actionsMade) : "—"}
                </TableCell>
                <TableCell>
                  <DurationValue ticks={durationTicks} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <span className={EDITOR_META_TEXT_CLASS}>
          Total duration: {formatDuration(variant.cycleTotalDurationTicks)}
        </span>
        <span className={EDITOR_META_TEXT_CLASS}>
          Cycles/hr: {typeof variant.cyclesPerHour === "number"
            ? variant.cyclesPerHour.toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })
            : "N/A"}
        </span>
      </div>
    </div>
  );
}

function ActionDetails({
  variant,
  itemsMap,
}: {
  variant: Variant;
  itemsMap: Record<number, Item>;
}) {
  const action = variant.action ?? variant.dynamicAction;

  if (!action) {
    return <EmptySelectionState description="No action details are configured for this variant." />;
  }

  return (
    <div className="space-y-4">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className={EDITOR_META_TEXT_CLASS}>Action name</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{action.name}</dd>
        </div>
        <div>
          <dt className={EDITOR_META_TEXT_CLASS}>Roll interval</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">
            {formatDuration(action.rollIntervalTicks)}
          </dd>
        </div>
        <div>
          <dt className={EDITOR_META_TEXT_CLASS}>Success chance</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">
            {formatSuccessChance(action.baseSuccessChance)}
          </dd>
        </div>
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <p className={EDITOR_SUBSECTION_TITLE_CLASS}>Inputs</p>
          <ActionItemTable
            entries={action.inputs ?? []}
            itemsMap={itemsMap}
            emptyMessage="No inputs configured."
          />
        </section>
        <section className="space-y-3">
          <p className={EDITOR_SUBSECTION_TITLE_CLASS}>Outputs</p>
          <ActionItemTable
            entries={action.outputs ?? []}
            itemsMap={itemsMap}
            emptyMessage="No outputs configured."
          />
        </section>
      </div>

      <section className="space-y-3">
        <p className={EDITOR_SUBSECTION_TITLE_CLASS}>Experience</p>
        <ActionXpTable entries={action.xpGained ?? []} />
      </section>
    </div>
  );
}

export function DynamicVariantDetails({
  variant,
  itemsMap,
}: {
  variant: Variant;
  itemsMap: Record<number, Item>;
}) {
  if (variant.calculationMode !== "dynamic") return null;

  return (
    <Accordion type="multiple">
      <AccordionItem
        value="cycle"
        className="border-0 border-t border-border/60"
      >
        <AccordionTrigger className="py-4 hover:no-underline">
          <span className="flex flex-col items-start gap-1">
            <span className={EDITOR_SUBSECTION_TITLE_CLASS}>Cycle</span>
            <span className={EDITOR_META_TEXT_CLASS}>
              View the ordered steps that make up one complete cycle.
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <CycleDetails variant={variant} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="action"
        className="border-0 border-t border-border/60"
      >
        <AccordionTrigger className="py-4 hover:no-underline">
          <span className="flex flex-col items-start gap-1">
            <span className={EDITOR_SUBSECTION_TITLE_CLASS}>Action details</span>
            <span className={EDITOR_META_TEXT_CLASS}>
              View the action timing, outcomes, and experience.
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <ActionDetails variant={variant} itemsMap={itemsMap} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
