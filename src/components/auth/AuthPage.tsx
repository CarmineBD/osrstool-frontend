import type { ReactNode } from "react";
import { CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const AUTH_CARD_CLASS =
  "border-border/70 bg-surface-panel-elevated shadow-sm";
export const AUTH_BODY_TEXT_CLASS = "text-sm leading-5 text-muted-foreground";
export const AUTH_META_TEXT_CLASS =
  "text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground";
export const AUTH_INLINE_LINK_CLASS =
  "font-medium text-link underline underline-offset-4 transition-colors hover:text-link-hover";
export const AUTH_OUTLINE_BUTTON_CLASS =
  "h-10 w-full border-border/70 bg-surface-panel shadow-none hover:bg-surface-panel-subtle";
export const AUTH_CONTROL_CLASS = "h-10 border-input bg-background shadow-none";
export const AUTH_ACTION_ROW_CLASS = "grid gap-3 sm:grid-cols-2";

type AuthPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function AuthPageShell({
  children,
  className,
}: AuthPageShellProps) {
  return (
    <section className="bg-[radial-gradient(circle_at_top_right,var(--surface-page-accent),var(--surface-page),var(--surface-page-contrast)_60%)]">
      <div
        className={cn(
          "mx-auto flex min-h-[70vh] w-full max-w-lg items-center px-4 py-8 sm:px-6 sm:py-10",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}

type AuthPageHeaderProps = {
  title: string;
  description: ReactNode;
  eyebrow?: string;
};

export function AuthPageHeader({
  title,
  description,
  eyebrow,
}: AuthPageHeaderProps) {
  return (
    <CardHeader className="gap-2 px-6 pb-0">
      {eyebrow ? <p className={AUTH_META_TEXT_CLASS}>{eyebrow}</p> : null}
      <h1 className="text-3xl font-semibold leading-9 tracking-tight text-foreground">
        {title}
      </h1>
      <div className={AUTH_BODY_TEXT_CLASS}>{description}</div>
    </CardHeader>
  );
}

type AuthSectionProps = {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title?: string;
};

export function AuthSection({
  children,
  className,
  description,
  title,
}: AuthSectionProps) {
  return (
    <section
      className={cn(
        "space-y-4 rounded-lg border border-border/70 bg-surface-panel p-4",
        className,
      )}
    >
      {title || description ? (
        <div className="space-y-1">
          {title ? (
            <h2 className="text-lg font-semibold leading-6 text-foreground">
              {title}
            </h2>
          ) : null}
          {description ? (
            <div className="text-sm leading-5 text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

type AuthSectionDividerProps = {
  label: string;
};

export function AuthSectionDivider({ label }: AuthSectionDividerProps) {
  return (
    <div className="flex items-center gap-3" aria-label={label}>
      <Separator className="flex-1 bg-border/70" />
      <span className="text-xs font-medium leading-4 text-muted-foreground">
        {label}
      </span>
      <Separator className="flex-1 bg-border/70" />
    </div>
  );
}

type AuthStatusTone = "error" | "info" | "success";

type AuthStatusMessageProps = {
  children: ReactNode;
  tone: AuthStatusTone;
};

export function AuthStatusMessage({
  children,
  tone,
}: AuthStatusMessageProps) {
  const toneClassName =
    tone === "error"
      ? "border-danger/20 bg-danger-soft text-danger-foreground"
      : tone === "success"
        ? "border-success/20 bg-success-soft text-success-foreground"
        : "border-info/20 bg-info-soft text-info-foreground";

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-[13px] font-medium leading-[18px]",
        toneClassName,
      )}
    >
      {children}
    </p>
  );
}
