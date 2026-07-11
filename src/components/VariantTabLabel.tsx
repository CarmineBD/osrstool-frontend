import { PixelArtIcon } from "@/components/method-editor/MethodEditorPrimitives";

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
      <PixelArtIcon src={iconUrl} alt={iconAlt} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export default VariantTabLabel;
