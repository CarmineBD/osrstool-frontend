import { IconPencil } from "@tabler/icons-react";
import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_META_TEXT_CLASS,
  EDITOR_PAGE_TITLE_CLASS,
} from "@/components/method-editor/MethodEditorPrimitives";
import type { Method } from "@/lib/api";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-3">
        <h1 className={EDITOR_PAGE_TITLE_CLASS}>{method.name}</h1>
        <p className={EDITOR_BODY_TEXT_CLASS}>{method.description}</p>
        <p className={EDITOR_META_TEXT_CLASS}>
          Category: {method.category}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {isSuperAdmin ? (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onEditClick}
            aria-label="Edit method"
          >
            <IconPencil size={20} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
