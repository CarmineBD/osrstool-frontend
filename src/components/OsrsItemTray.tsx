import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from "react";
import { PixelArtIcon } from "@/components/method-editor/MethodEditorPrimitives";
import OsrsQuantitySprite from "@/components/OsrsQuantitySprite";
import { cn } from "@/lib/utils";

export const OSRS_ITEM_TRAY_CLASS =
  "min-h-14 w-full rounded-lg border border-[var(--method-detail-item-tray-border)] bg-[var(--method-detail-item-tray)] p-4 shadow-[var(--method-detail-item-tray-shadow)]";
export const OSRS_ITEM_TRAY_TEXT_CLASS =
  "text-[var(--method-detail-item-tray-foreground)]";
export const OSRS_ITEM_TRAY_BAR_ACTIVE_CLASS =
  "bg-[var(--method-detail-item-tray-bar)]";
export const OSRS_ITEM_TRAY_BAR_MUTED_CLASS =
  "bg-[var(--method-detail-item-tray-bar-muted)]";

export function formatOsrsItemQuantity(quantity: number): {
  label: string;
  color: "yellow" | "white" | "green";
  showExactQuantity: boolean;
} {
  if (quantity > 999_999_999) {
    return {
      label: `${(quantity / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`,
      color: "green",
      showExactQuantity: true,
    };
  }

  if (quantity > 9_999_999) {
    return {
      label: `${Math.floor(quantity / 1_000_000)}M`,
      color: "green",
      showExactQuantity: true,
    };
  }

  if (quantity > 99_999) {
    return {
      label: `${Math.floor(quantity / 1_000)}k`,
      color: "white",
      showExactQuantity: true,
    };
  }

  return {
    label: String(quantity),
    color: "yellow",
    showExactQuantity: false,
  };
}

export const OsrsItemSprite = forwardRef<
  HTMLDivElement,
  {
    iconUrl: string;
    itemName: string;
    quantity: number;
    quantityDisplay: ReturnType<typeof formatOsrsItemQuantity>;
  } & ComponentPropsWithoutRef<"div">
>(function OsrsItemSprite(
  { iconUrl, itemName, quantity, quantityDisplay, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("relative grid h-8 w-8 place-items-center", className)}
      {...props}
    >
      <PixelArtIcon
        src={iconUrl}
        alt={itemName}
        className="h-8 w-8"
        imgClassName="drop-shadow-[1px_1px_0_var(--method-detail-item-sprite-shadow)]"
      />

      {quantity > 0 ? (
        <OsrsQuantitySprite
          text={quantityDisplay.label}
          color={quantityDisplay.color}
          scale={1}
          className="pointer-events-none absolute top-0 left-[2px]"
        />
      ) : null}
    </div>
  );
});
