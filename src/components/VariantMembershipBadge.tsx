import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type VariantMembershipBadgeProps = {
  members?: boolean;
  compact?: boolean;
} & Omit<ComponentProps<typeof Badge>, "children">;

export function VariantMembershipBadge({
  members = false,
  compact = false,
  className,
  size = "sm",
  ...props
}: VariantMembershipBadgeProps) {
  return (
    <Badge
      variant="outline"
      size={size}
      className={cn(
        members
          ? "border-brand/35 bg-brand-soft text-brand-soft-foreground"
          : "border-surface-highlight-border bg-surface-highlight text-foreground",
        className,
      )}
      {...props}
    >
      {members ? "Members" : compact ? "F2P" : "Free-to-play"}
    </Badge>
  );
}
