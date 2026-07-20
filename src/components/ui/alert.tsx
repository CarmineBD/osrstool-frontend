import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const DEFAULT_ALERT_EXIT_DURATION_MS =
  220;

const alertVariants = cva(
  "grid gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 group/alert relative w-full",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  );
}

function prefersReducedMotion() {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function AlertPresence({
  present,
  children,
  className,
  exitDurationMs = DEFAULT_ALERT_EXIT_DURATION_MS,
}: {
  present: boolean;
  children: React.ReactNode;
  className?: string;
  exitDurationMs?: number;
}) {
  const [shouldRender, setShouldRender] = React.useState(present);
  const [isOpen, setIsOpen] = React.useState(present);
  const frameRef = React.useRef<number | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

  const clearPendingWork = React.useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => clearPendingWork, [clearPendingWork]);

  React.useEffect(() => {
    clearPendingWork();

    if (present) {
      setShouldRender(true);
      frameRef.current = window.requestAnimationFrame(() => {
        setIsOpen(true);
      });
      return;
    }

    if (!shouldRender) {
      return;
    }

    setIsOpen(false);

    if (prefersReducedMotion()) {
      setShouldRender(false);
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      setShouldRender(false);
    }, exitDurationMs);
  }, [clearPendingWork, exitDurationMs, present, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows,opacity] ease-in motion-reduce:transition-none",
        "data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100",
        "data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0",
        className,
      )}
      style={{ transitionDuration: `${exitDurationMs}ms` }}
    >
      <div
        data-state={isOpen ? "open" : "closed"}
        className={cn(
          "min-h-0 origin-center transform-gpu",
          "transition-[transform,opacity] ease-in",
          "will-change-[transform,opacity]",
          "motion-reduce:transition-none motion-reduce:transform-none",

          "data-[state=open]:scale-100 data-[state=open]:opacity-100",
          "data-[state=closed]:scale-[0.85] data-[state=closed]:opacity-0",
        )}
        style={{ transitionDuration: `${exitDurationMs}ms` }}
      >
        {children}
      </div>
    </div>
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction, AlertPresence };
