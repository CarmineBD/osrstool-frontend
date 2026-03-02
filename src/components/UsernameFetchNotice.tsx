import { useEffect, useState, type ReactNode } from "react";
import { IconInfoCircle, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

function focusUsernameInput() {
  const usernameInput = document.getElementById(
    "username-input",
  ) as HTMLInputElement | null;
  if (!usernameInput) return;
  usernameInput.focus();
  usernameInput.select?.();
}

type UsernameFetchNoticeProps = {
  showPrompt?: boolean;
  icon?: ReactNode;
  className?: string;
  resetKey?: string | number | boolean;
  dismissLabel?: string;
  children?: ReactNode;
};

export function UsernameFetchNotice({
  showPrompt = true,
  icon,
  className,
  resetKey,
  dismissLabel = "Dismiss requirements notice",
  children,
}: UsernameFetchNoticeProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsDismissed(false);
  }, [resetKey]);

  if (isDismissed) return null;
  if (!showPrompt && !children) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-gray-300 bg-gray-200 p-4 text-sm dark:border-gray-700 dark:bg-gray-800",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <span className="mt-0.5 inline-flex rounded-full border border-gray-300 bg-white p-1.5 text-muted-foreground dark:border-gray-600 dark:bg-gray-900/40">
          {icon ?? <IconInfoCircle className="size-4" />}
        </span>

        <div className="min-w-0 flex-1 space-y-3">
          {showPrompt ? (
            <p className="text-gray-700 dark:text-gray-200">
              Please{" "}
              <button
                type="button"
                className="cursor-pointer underline"
                onClick={focusUsernameInput}
              >
                enter your username
              </button>{" "}
              to fetch your user data.
            </p>
          ) : null}
          {children}
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label={dismissLabel}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground dark:border-gray-600 dark:bg-gray-900/40 dark:hover:bg-gray-900"
        >
          <IconX className="size-4" />
        </button>
      </div>
    </div>
  );
}
