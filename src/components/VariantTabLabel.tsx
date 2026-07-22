import type { ReactNode } from "react";
import { PixelArtIcon } from "@/components/method-editor/MethodEditorPrimitives";
import { cn } from "@/lib/utils";

interface VariantTabLabelProps {
  label: string;
  iconUrl?: string;
  iconAlt?: string;
  summary?: ReactNode;
  className?: string;
  labelClassName?: string;
  summaryClassName?: string;
}

export function VariantTabLabel({
  label,
  iconUrl,
  iconAlt = "",
  summary,
  className,
  labelClassName,
  summaryClassName,
}: VariantTabLabelProps) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <PixelArtIcon src={iconUrl} alt={iconAlt} />
        <span title={label} className={cn("truncate", labelClassName)}>
          {label}
        </span>
      </span>
      {summary ? (
        <span
          className={cn(
            "flex w-[6.75rem] shrink-0 justify-end overflow-hidden text-right leading-tight",
            summaryClassName,
          )}
        >
          {summary}
        </span>
      ) : null}
    </span>
  );
}

export default VariantTabLabel;
