export const METHOD_NAME_MAX_LENGTH = 120;
export const VARIANT_LABEL_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 5000;
export const REASON_MAX_LENGTH = 500;
export const SEARCH_QUERY_MAX_LENGTH = 100;
export const USERNAME_MAX_LENGTH = 12;
export const ADMIN_SCRIPT_NAME_MAX_LENGTH = 160;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MAX_LENGTH = 128;
export const INPUTS_MAX_COUNT = 200;
export const OUTPUTS_MAX_COUNT = 200;
export const REQUIREMENT_ENTRIES_MAX_COUNT = 100;
export const MAX_ITEM_QUANTITY = 999_999_999;
export const MAX_ITEM_QUANTITY_DECIMAL_PLACES = 6;
export const MAX_XP_PER_HOUR = 99_999_999;
export const MAX_XP_HOUR_SKILLS = 24;
export const MAX_CLICK_INTENSITY = 99_999;
export const MAX_AFKINESS = 100;
export const MAX_SKILL_LEVEL = 99;
export const MIN_COMBAT_LEVEL = 3;
export const MAX_COMBAT_LEVEL = 126;

type RequirementCollection = {
  items?: unknown[];
  levels?: unknown[];
  quests?: unknown[];
  achievement_diaries?: unknown[];
};

export function normalizeBoundedText(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

export function normalizeDigitInput(value: string, maxDigits: number): string {
  return value.replace(/\D/g, "").slice(0, maxDigits);
}

export function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;

  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function countDecimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;

  const normalized = value.toString().toLowerCase();
  if (normalized.includes("e")) {
    const [coefficient, exponentValue] = normalized.split("e");
    const exponent = Number(exponentValue);
    const fraction = coefficient.split(".")[1]?.length ?? 0;
    return exponent >= 0 ? Math.max(0, fraction - exponent) : fraction + Math.abs(exponent);
  }

  return normalized.split(".")[1]?.length ?? 0;
}

export function hasAtMostDecimalPlaces(
  value: number,
  maxDecimalPlaces: number,
): boolean {
  return countDecimalPlaces(value) <= maxDecimalPlaces;
}

export function clampDecimal(
  value: number | undefined,
  min: number,
  max: number,
  maxDecimalPlaces: number,
): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;

  const clamped = Math.min(max, Math.max(min, value));
  const factor = 10 ** maxDecimalPlaces;
  return Math.floor(clamped * factor) / factor;
}

export function countRequirementEntries(
  value: RequirementCollection | undefined,
): number {
  if (!value) return 0;

  return (
    (value.items?.length ?? 0) +
    (value.levels?.length ?? 0) +
    (value.quests?.length ?? 0) +
    (value.achievement_diaries?.length ?? 0)
  );
}
