import { IconPencil } from "@tabler/icons-react";
import type { Method, Item } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Markdown from "@/components/Markdown";
import { LikeButton } from "@/features/methods/LikeButton";

interface MethodDetailHeaderProps {
  method: Method;
  itemsMap: Record<number, Item>;
  isSuperAdmin: boolean;
  onEditClick: () => void;
}

export function MethodDetailHeader({
  method,
  itemsMap,
  isSuperAdmin,
  onEditClick,
}: MethodDetailHeaderProps) {
  return (
    <>
      {isSuperAdmin ? (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={onEditClick}
        >
          <IconPencil size={20} />
        </Button>
      ) : null}

      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {method.name}
      </h1>

      <div className="mb-4 mt-2 flex items-center">
        <LikeButton
          methodId={method.id}
          likedByMe={method.likedByMe}
          likes={method.likes ?? 0}
        />
      </div>

      <Markdown content={method.description} items={itemsMap} />

      <div className="mb-4">
        <span className="font-semibold">Category:</span> {method.category}
      </div>
    </>
  );
}
