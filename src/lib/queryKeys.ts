import type { Method } from "@/lib/api";

export function normalizeMethodSlug(slug?: string): string {
  return (slug ?? "").trim();
}

export function normalizeUsername(username?: string): string | undefined {
  const normalized = username?.trim();
  return normalized ? normalized : undefined;
}

export function getMethodDetailQueryKey(slug: string, username?: string) {
  return [
    "methodDetail",
    normalizeMethodSlug(slug),
    normalizeUsername(username),
  ] as const;
}

export function getMethodItemIds(method?: Method): number[] {
  if (!method) return [];
  const ids = new Set<number>();
  method.variants.forEach((variant) => {
    variant.inputs.forEach((item) => ids.add(item.id));
    variant.outputs.forEach((item) => ids.add(item.id));
    variant.requirements?.items?.forEach((item) => ids.add(item.id));
    variant.recommendations?.items?.forEach((item) => ids.add(item.id));
  });
  return Array.from(ids).sort((a, b) => a - b);
}

export function normalizeItemIds(itemIds: readonly number[]): number[] {
  return Array.from(new Set(itemIds)).sort((a, b) => a - b);
}

export function getItemsQueryKey(itemIds: readonly number[]) {
  return ["items", normalizeItemIds(itemIds)] as const;
}
