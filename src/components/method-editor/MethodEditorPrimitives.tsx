import type { ElementType, ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const EDITOR_PAGE_EYEBROW_CLASS =
  "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground";
export const EDITOR_PAGE_TITLE_CLASS =
  "text-3xl font-semibold leading-9 tracking-tight text-foreground";
export const EDITOR_SECTION_TITLE_CLASS =
  "text-lg font-semibold leading-6 text-foreground";
export const EDITOR_SUBSECTION_TITLE_CLASS =
  "text-sm font-semibold leading-5 text-foreground";
export const EDITOR_FIELD_LABEL_CLASS =
  "mb-2 block text-sm font-medium leading-5 text-foreground";
export const EDITOR_BODY_TEXT_CLASS = "text-sm leading-5 text-muted-foreground";
export const EDITOR_META_TEXT_CLASS =
  "text-xs font-medium leading-4 text-muted-foreground";
export const EDITOR_ERROR_TEXT_CLASS =
  "text-[13px] font-medium leading-[18px] text-destructive";

export const EDITOR_PAGE_SHELL_CLASS =
  "rounded-xl border border-border/70 bg-card shadow-sm";
export const EDITOR_PRIMARY_CARD_CLASS =
  "gap-0 rounded-xl border border-border/70 bg-card shadow-sm";
export const EDITOR_SECONDARY_CARD_CLASS =
  "gap-0 rounded-xl border border-border/70 bg-muted/20 shadow-none";
export const EDITOR_CARD_HEADER_CLASS = "gap-4 border-b border-border/60 pb-6";
export const EDITOR_CARD_CONTENT_CLASS = "space-y-6 pt-6";
export const EDITOR_NESTED_SURFACE_CLASS =
  "rounded-lg border border-border/70 bg-muted/20";
export const EDITOR_SECTION_CARD_CLASS =
  "space-y-4 rounded-lg border border-border/70 bg-muted/20 p-6";
export const EDITOR_TAB_LIST_CLASS =
  "h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-muted/30 p-1";
export const EDITOR_DASHED_ACTION_CLASS =
  "inline-flex h-9 flex-none items-center justify-center gap-2 rounded-md border border-dashed border-border/70 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground";
export const EDITOR_TABLE_SURFACE_CLASS =
  "rounded-lg border border-border/70 table-fixed";
export const EDITOR_TABLE_HEADER_CLASS = "bg-muted/40 text-foreground";
export const EDITOR_NAME_COLUMN_CLASS = "w-[24%]";
export const EDITOR_REASON_COLUMN_CLASS = "w-[36%]";

interface SectionHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  level?: "h1" | "h2" | "h3";
  className?: string;
  bodyClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function SectionHeader({
  title,
  description,
  eyebrow,
  actions,
  level = "h2",
  className,
  bodyClassName,
  titleClassName,
  descriptionClassName,
}: SectionHeaderProps) {
  const TitleTag = level as ElementType;
  const titleClassByLevel =
    level === "h1"
      ? EDITOR_PAGE_TITLE_CLASS
      : level === "h2"
        ? EDITOR_SECTION_TITLE_CLASS
        : EDITOR_SUBSECTION_TITLE_CLASS;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className={cn("space-y-1", bodyClassName)}>
        {eyebrow ? <p className={EDITOR_PAGE_EYEBROW_CLASS}>{eyebrow}</p> : null}
        <TitleTag className={cn(titleClassByLevel, titleClassName)}>
          {title}
        </TitleTag>
        {description ? (
          <p className={cn(EDITOR_BODY_TEXT_CLASS, descriptionClassName)}>
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

interface EditorSubsectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  bordered?: boolean;
  className?: string;
  contentClassName?: string;
}

export function EditorSubsection({
  title,
  description,
  actions,
  children,
  bordered = true,
  className,
  contentClassName,
}: EditorSubsectionProps) {
  return (
    <section
      className={cn(
        "space-y-4 px-6 py-6",
        bordered && "border-t border-border/60",
        className,
      )}
    >
      <SectionHeader
        title={title}
        description={description}
        actions={actions}
        level="h3"
      />
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

interface EmptySelectionStateProps {
  title?: string;
  description: string;
  className?: string;
}

export function EmptySelectionState({
  title,
  description,
  className,
}: EmptySelectionStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center",
        className,
      )}
    >
      {title ? (
        <p className="text-sm font-medium leading-5 text-foreground">{title}</p>
      ) : null}
      <p className={cn(EDITOR_BODY_TEXT_CLASS, title && "mt-1")}>{description}</p>
    </div>
  );
}

interface PixelArtIconProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  size?: "sm" | "md";
  title?: string;
}

export function PixelArtIcon({
  src,
  alt,
  className,
  imgClassName,
  size = "md",
  title,
}: PixelArtIconProps) {
  if (!src) return null;

  const sizeClassName = size === "sm" ? "h-5 w-5" : "h-[30px] w-[30px]";

  return (
    <span
      title={title}
      className={cn(
        "flex shrink-0 items-center justify-center",
        sizeClassName,
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          "h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]",
          imgClassName,
        )}
      />
    </span>
  );
}

interface InlineSwitchFieldProps {
  label: string;
  checked: boolean;
  stateLabel: string;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function InlineSwitchField({
  label,
  checked,
  stateLabel,
  onCheckedChange,
  className,
}: InlineSwitchFieldProps) {
  return (
    <div className={className}>
      <label className={EDITOR_FIELD_LABEL_CLASS}>{label}</label>
      <div className="flex h-10 items-center gap-3">
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
        <span className={EDITOR_META_TEXT_CLASS}>{stateLabel}</span>
      </div>
    </div>
  );
}
