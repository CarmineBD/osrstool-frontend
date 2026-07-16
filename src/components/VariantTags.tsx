import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { VariantTag } from "@/lib/api";
import { cn } from "@/lib/utils";
import { normalizeVariantTags } from "@/lib/variantTags";

const TABLE_GAP_PX = 4;
const TABLE_FALLBACK_VISIBLE_COUNT = 2;
const TABLE_TAG_FONT = "500 12px sans-serif";
const MORE_TRIGGER_FONT = "500 12px sans-serif";

function getVariantTagToneClassName(severity?: VariantTag["severity"] | null) {
  switch (severity) {
    case 1:
      return "border-emerald-300/80 bg-emerald-50 text-emerald-900";
    case 2:
      return "border-amber-300/80 bg-amber-50 text-amber-900";
    case 3:
      return "border-rose-300/80 bg-rose-50 text-rose-900";
    default:
      return "border-border/70 bg-muted/30 text-foreground";
  }
}

function measureTextWidth(text: string, font: string): number {
  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("jsdom")
  ) {
    return text.length * 7;
  }

  if (typeof document === "undefined") {
    return text.length * 7;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return text.length * 7;
  }

  context.font = font;
  return context.measureText(text).width;
}

function getMoreTriggerWidth(hiddenCount: number): number {
  return measureTextWidth(`... ${hiddenCount} more`, MORE_TRIGGER_FONT);
}

function getFallbackTagWidth(label: string): number {
  return measureTextWidth(label, TABLE_TAG_FONT) + 24;
}

function VariantTagChip({
  tag,
  size,
  truncate = false,
  chipRef,
}: {
  tag: VariantTag;
  size: "sm" | "md";
  truncate?: boolean;
  chipRef?: (node: HTMLSpanElement | null) => void;
}) {
  const badge = (
    <span ref={chipRef} className={cn(truncate ? "max-w-full" : "")}>
      <Badge
        size={size}
        variant="outline"
        className={cn(
          getVariantTagToneClassName(tag.severity),
          truncate ? "max-w-full" : "",
        )}
        data-severity={tag.severity ?? undefined}
      >
        <span className={cn(truncate ? "truncate" : "")}>{tag.label}</span>
      </Badge>
    </span>
  );

  if (!tag.description) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent sideOffset={6} className="max-w-xs text-left text-wrap">
        <p className="m-0 whitespace-pre-line">{tag.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function VariantTags({
  tags,
  mode = "detail",
  emptyLabel = "None",
  className,
}: {
  tags?: VariantTag[] | null;
  mode?: "table" | "detail";
  emptyLabel?: string;
  className?: string;
}) {
  const normalizedTags = useMemo(() => normalizeVariantTags(tags), [tags]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tagRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [measuredWidths, setMeasuredWidths] = useState<number[] | null>(null);
  const [visibleCount, setVisibleCount] = useState(normalizedTags.length);
  const isTableMode = mode === "table";

  useEffect(() => {
    setMeasuredWidths(null);
    setVisibleCount(normalizedTags.length);
  }, [normalizedTags]);

  useEffect(() => {
    if (!isTableMode) return;

    const node = containerRef.current;
    if (!node) return;

    const updateWidth = () => {
      setContainerWidth(node.clientWidth);
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isTableMode]);

  useEffect(() => {
    if (!isTableMode || measuredWidths !== null || normalizedTags.length === 0) {
      return;
    }

    const widths = tagRefs.current
      .slice(0, normalizedTags.length)
      .map((node, index) => {
        const measuredWidth = node?.getBoundingClientRect().width ?? 0;
        return measuredWidth > 0
          ? measuredWidth
          : getFallbackTagWidth(normalizedTags[index]?.label ?? "");
      });

    setMeasuredWidths(widths);
  }, [isTableMode, measuredWidths, normalizedTags, visibleCount]);

  useEffect(() => {
    if (!isTableMode) return;

    if (normalizedTags.length <= 1) {
      setVisibleCount(normalizedTags.length);
      return;
    }

    if (containerWidth <= 0 || !measuredWidths?.length) {
      setVisibleCount(
        Math.min(normalizedTags.length, TABLE_FALLBACK_VISIBLE_COUNT),
      );
      return;
    }

    let nextVisibleCount = normalizedTags.length;

    for (let count = normalizedTags.length; count >= 0; count -= 1) {
      const hiddenCount = normalizedTags.length - count;
      const visibleWidths = measuredWidths.slice(0, count);
      const visibleWidth =
        visibleWidths.reduce((sum, width) => sum + width, 0) +
        Math.max(0, visibleWidths.length - 1) * TABLE_GAP_PX;
      const moreWidth =
        hiddenCount > 0
          ? getMoreTriggerWidth(hiddenCount) +
            (count > 0 ? TABLE_GAP_PX : 0)
          : 0;

      if (visibleWidth + moreWidth <= containerWidth) {
        nextVisibleCount = count;
        break;
      }
    }

    setVisibleCount(nextVisibleCount);
  }, [containerWidth, isTableMode, measuredWidths, normalizedTags.length]);

  if (normalizedTags.length === 0) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        {emptyLabel}
      </span>
    );
  }

  const visibleTags = isTableMode
    ? normalizedTags.slice(0, visibleCount)
    : normalizedTags;
  const hiddenTags = isTableMode ? normalizedTags.slice(visibleCount) : [];

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-w-0",
        isTableMode
          ? "flex items-center gap-1 overflow-hidden whitespace-nowrap"
          : "flex flex-wrap gap-2",
        className,
      )}
    >
      {visibleTags.map((tag, index) => (
        <VariantTagChip
          key={`${tag.label}-${index}`}
          tag={tag}
          size={isTableMode ? "sm" : "md"}
          truncate={isTableMode}
          chipRef={(node) => {
            tagRefs.current[index] = node;
          }}
        />
      ))}

      {hiddenTags.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
              aria-label={`Show ${hiddenTags.length} more tags`}
              title={hiddenTags.map((tag) => tag.label).join("\n")}
            >
              {`... ${hiddenTags.length} more`}
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="max-w-xs text-left">
            <div className="space-y-1">
              {hiddenTags.map((tag, index) => (
                <p key={`${tag.label}-hidden-${index}`} className="m-0">
                  {tag.label}
                </p>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
