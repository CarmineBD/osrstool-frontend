import { IconPencil } from "@tabler/icons-react";
import type { Method } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { LikeButton } from "@/features/methods/LikeButton";

interface MethodDetailHeaderProps {
  method: Method;
  isSuperAdmin: boolean;
  onEditClick: () => void;
}

export function MethodDetailHeader({
  method,
  isSuperAdmin,
  onEditClick,
}: MethodDetailHeaderProps) {
  return (
    <div className="flex justify-between">
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
            {method.name}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{method.description}</p>
        {/* <div className="text-sm">
          <span className="font-semibold">Category:</span> {method.category}
        </div> */}
      </div>

      <div className="flex items-start gap-4">
        <div className="flex items-center">
          <LikeButton
            methodId={method.id}
            likedByMe={method.likedByMe}
            likes={method.likes ?? 0}
          />
        </div>
        {isSuperAdmin ? (
          <Button
            variant="ghost"
            size="icon"
            className="relative top-0 right-0"
            onClick={onEditClick}
          >
            <IconPencil size={20} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
