import { useEffect, useState, type ReactNode } from "react";
import { OPEN_NAV_USERNAME_EVENT } from "@/lib/events";
import { Alert, AlertDescription, AlertTitle, AlertAction } from "./ui/alert";
import { AlertCircleIcon, CheckCircle2Icon, InfoIcon } from "lucide-react";
import { IconX } from "@tabler/icons-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

function focusInput(inputId: string) {
  const usernameInput = document.getElementById(
    inputId,
  ) as HTMLInputElement | null;
  if (!usernameInput) return;
  if (usernameInput.offsetParent === null) return;
  usernameInput.focus();
  usernameInput.select?.();
}

function focusUsernameInput() {
  focusInput("username-input");
  if (document.activeElement?.id === "username-input") return;

  focusInput("username-input-mobile");
  if (document.activeElement?.id === "username-input-mobile") return;

  window.dispatchEvent(new Event(OPEN_NAV_USERNAME_EVENT));
}

export type UsernameFetchNoticeState = "info" | "error" | "success";

type UsernameFetchNoticeBaseProps = {
  className?: string;
  dismissLabel?: string;
  resetKey?: string | number | boolean;
};

type UsernameFetchNoticeProps =
  | (UsernameFetchNoticeBaseProps & {
      state: "info";
    })
  | (UsernameFetchNoticeBaseProps & {
      state: "error";
      children: ReactNode;
    })
  | (UsernameFetchNoticeBaseProps & {
      state: "success";
    });

const noticeToneClassByState: Record<UsernameFetchNoticeState, string> = {
  info: "border-sky-300/70 bg-sky-50 text-sky-900 dark:border-sky-900/45 dark:bg-sky-950/25 dark:text-sky-100",
  error:
    "border-rose-300/70 bg-rose-50 text-rose-900 dark:border-rose-900/45 dark:bg-rose-950/25 dark:text-rose-100",
  success:
    "border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-900/45 dark:bg-emerald-950/25 dark:text-emerald-100",
};

type NoticeContent = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
};

function getNoticeContent(state: UsernameFetchNoticeState): NoticeContent {
  if (state === "info") {
    return {
      icon: <InfoIcon />,
      title: "Fetch username",
      description:
        "Enter your OSRS username to fetch your user data and filter methods by your stats.",
      action: (
        <Button onClick={focusUsernameInput} size="sm" variant="default">
          Fetch user data
        </Button>
      ),
    };
  }

  if (state === "success") {
    return {
      icon: <CheckCircle2Icon />,
      title: "All requirements met",
      description:
        "Congratulations! Your character meets all the requirements to do this method.",
    };
  }

  return {
    icon: <AlertCircleIcon />,
    title: "Requirements not met",
    description: "",
  };
}

export function UsernameFetchNotice(props: UsernameFetchNoticeProps) {
  const {
    state,
    className,
    dismissLabel = "Dismiss username notice",
    resetKey,
  } = props;
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsDismissed(false);
  }, [state, resetKey]);

  if (isDismissed) return null;

  const noticeContent = getNoticeContent(state);
  const body = state === "error" ? props.children : noticeContent.description;

  return (
    <Alert
      className={cn(
        "pr-10 has-data-[slot=alert-action]:pr-30",
        noticeToneClassByState[state],
        className,
      )}
    >
      {noticeContent.icon}
      <AlertTitle>{noticeContent.title}</AlertTitle>
      <AlertDescription>{body}</AlertDescription>
      {noticeContent.action ? (
        <AlertAction className="right-10">{noticeContent.action}</AlertAction>
      ) : null}
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={() => setIsDismissed(true)}
        className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md text-current/70 transition-colors hover:bg-black/8 hover:text-current"
      >
        <IconX className="size-4" />
      </button>
    </Alert>
  );
}
