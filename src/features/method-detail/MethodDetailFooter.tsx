import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_META_TEXT_CLASS,
} from "@/components/method-editor/MethodEditorPrimitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Method } from "@/lib/api";

const methodDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatMethodDateTime(value?: string): string {
  if (!value) return "Not available";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return methodDateTimeFormatter.format(parsed);
}

interface MethodDetailFooterProps {
  method?: Method;
  creatorAvatarUrl?: string;
}

export function MethodDetailFooter({
  method,
  creatorAvatarUrl,
}: MethodDetailFooterProps) {
  if (!method) {
    return null;
  }

  if (!method.created_by && !method.created_at && !method.updated_at) {
    return null;
  }

  const creatorName = method.created_by?.username?.trim() || "Unknown user";
  const creatorFallback = creatorName.charAt(0).toUpperCase() || "?";

  return (
    <footer className="border-t border-border/60 bg-muted/20 px-6 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            aria-label={`${creatorName} avatar`}
            className="h-10 w-10 border border-border/70 bg-background"
          >
            {creatorAvatarUrl ? (
              <AvatarImage src={creatorAvatarUrl} alt={`${creatorName} avatar`} />
            ) : null}
            <AvatarFallback className="bg-background text-xs font-semibold text-muted-foreground">
              {creatorFallback}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-1">
            <p className={EDITOR_META_TEXT_CLASS}>Created by</p>
            <p className="truncate text-sm font-medium leading-5 text-foreground">
              {creatorName}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div className="space-y-1">
            <dt className={EDITOR_META_TEXT_CLASS}>Created</dt>
            <dd
              className={`${EDITOR_BODY_TEXT_CLASS} font-medium text-foreground`}
            >
              <time dateTime={method.created_at}>
                {formatMethodDateTime(method.created_at)}
              </time>
            </dd>
          </div>

          <div className="space-y-1">
            <dt className={EDITOR_META_TEXT_CLASS}>Last updated</dt>
            <dd
              className={`${EDITOR_BODY_TEXT_CLASS} font-medium text-foreground`}
            >
              <time dateTime={method.updated_at}>
                {formatMethodDateTime(method.updated_at)}
              </time>
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
