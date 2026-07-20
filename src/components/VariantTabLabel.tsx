import { AnimatedProfitValue } from "@/components/AnimatedProfitValue";
import { PixelArtIcon } from "@/components/method-editor/MethodEditorPrimitives";
import { cn } from "@/lib/utils";

interface VariantTabLabelProps {
  label: string;
  iconUrl?: string;
  iconAlt?: string;
  showProfitSummary?: boolean;
  highProfit?: number;
  lowProfit?: number;
  className?: string;
  labelClassName?: string;
  profitClassName?: string;
}

export function VariantTabLabel({
  label,
  iconUrl,
  iconAlt = "",
  showProfitSummary = false,
  highProfit,
  lowProfit,
  className,
  labelClassName,
  profitClassName,
}: VariantTabLabelProps) {
  const highProfitIsNegative =
    typeof highProfit === "number" && Number.isFinite(highProfit) && highProfit < 0;
  const lowProfitIsNegative =
    typeof lowProfit === "number" && Number.isFinite(lowProfit) && lowProfit < 0;
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <PixelArtIcon src={iconUrl} alt={iconAlt} />
        <span title={label} className={cn("truncate", labelClassName)}>
          {label}
        </span>
      </span>
      {showProfitSummary ? (
        <span
          className={cn(
            "flex w-[5.5rem] shrink-0 flex-col text-right leading-tight",
            profitClassName,
          )}
        >
          <span
            className={cn(
              "truncate text-sm font-medium",
              highProfitIsNegative ? "text-destructive" : "text-foreground",
            )}
          >
            <AnimatedProfitValue value={highProfit} />
          </span>
          <span
            className={cn(
              "truncate text-xs",
              lowProfitIsNegative
                ? "text-danger-foreground"
                : "text-muted-foreground",
            )}
          >
            <AnimatedProfitValue value={lowProfit} />
          </span>
        </span>
      ) : null}
    </span>
  );
}

export default VariantTabLabel;
