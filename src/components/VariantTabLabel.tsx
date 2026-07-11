interface VariantTabLabelProps {
  label: string;
  iconUrl?: string;
  iconAlt?: string;
}

export function VariantTabLabel({
  label,
  iconUrl,
  iconAlt = "",
}: VariantTabLabelProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {iconUrl ? (
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
          <img
            src={iconUrl}
            alt={iconAlt}
            className="h-auto w-auto max-h-full max-w-full [image-rendering:pixelated]"
          />
        </span>
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

export default VariantTabLabel;
