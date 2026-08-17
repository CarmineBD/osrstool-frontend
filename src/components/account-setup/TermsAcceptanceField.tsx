import type { RefObject } from "react";
import { FieldError, FieldLabel } from "@/components/ui/field";

type TermsAcceptanceFieldProps = {
  checkboxId: string;
  checkboxRef?: RefObject<HTMLInputElement | null>;
  checked: boolean;
  disabled?: boolean;
  error?: string | null;
  description?: string;
  variant?: "boxed" | "plain";
  onCheckedChange: (checked: boolean) => void;
};

export function TermsAcceptanceField({
  checkboxId,
  checkboxRef,
  checked,
  disabled = false,
  error,
  description,
  variant = "boxed",
  onCheckedChange,
}: TermsAcceptanceFieldProps) {
  return (
    <div className="space-y-2">
      <div
        className={
          variant === "boxed"
            ? "flex items-start gap-3 rounded-lg border bg-background p-4"
            : "flex items-start gap-3"
        }
      >
        <input
          ref={checkboxRef}
          id={checkboxId}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded-md border border-input bg-background accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
        />
        <div className="space-y-1">
          <FieldLabel htmlFor={checkboxId} className="leading-5">
            I have read and accept the current Terms of Use.
          </FieldLabel>
          {description ? (
            <p className="text-xs font-medium leading-4 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <FieldError className="text-[13px] font-medium leading-[18px]">
        {error}
      </FieldError>
    </div>
  );
}
