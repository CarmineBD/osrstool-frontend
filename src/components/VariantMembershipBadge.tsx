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
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-700",
        className,
      )}
      {...props}
    >
      {members ? "Members" : compact ? "F2P" : "Free-to-play"}
    </Badge>
  );
}
