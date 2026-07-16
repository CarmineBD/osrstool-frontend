import type { Variant, VariantTag } from "@/lib/api";

type VariantTagSource = Pick<Variant, "tags">;

function normalizeVariantTagSeverity(
  severity?: VariantTag["severity"] | number | null,
): VariantTag["severity"] | undefined {
  return severity === 1 || severity === 2 || severity === 3
    ? severity
    : undefined;
}

export function normalizeVariantTags(
  tags?: VariantTag[] | null,
): VariantTag[] {
  if (!Array.isArray(tags)) return [];

  return tags.reduce<VariantTag[]>((normalizedTags, tag) => {
    const label = tag?.label?.trim();
    if (!label) return normalizedTags;

    const description = tag.description?.trim();
    normalizedTags.push({
      label,
      severity: normalizeVariantTagSeverity(tag.severity),
      description: description ? description : undefined,
    });

    return normalizedTags;
  }, []);
}

export function getVariantTags(source?: VariantTagSource | null): VariantTag[] {
  if (!source) return [];

  return normalizeVariantTags(source.tags);
}
