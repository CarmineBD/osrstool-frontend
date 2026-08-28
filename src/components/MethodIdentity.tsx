import type { ReactNode } from "react";

type MethodIdentityProps = {
  iconUrl?: string;
  iconAlt: string;
  methodName: ReactNode;
  variantLabel?: string | null;
};

export function MethodIdentity({
  iconUrl,
  iconAlt,
  methodName,
  variantLabel,
}: MethodIdentityProps) {
  return (
    <div className="flex items-start gap-2">
      {iconUrl ? (
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
          <img
            src={iconUrl}
            alt={iconAlt}
            className="h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]"
          />
        </div>
      ) : null}
      <div className="min-w-0 space-y-1">
        {methodName}
        {variantLabel ? (
          <p className="truncate text-xs font-medium leading-4 text-muted-foreground">
            {variantLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
