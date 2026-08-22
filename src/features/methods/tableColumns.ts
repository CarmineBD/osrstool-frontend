export type MethodsTableColumnId =
  | "requirements"
  | "methodName"
  | "members"
  | "variant"
  | "gpPerHr"
  | "tags"
  | "gpPerXp"
  | "liquidityScore"
  | "xpPerHr"
  | "clickIntensity"
  | "afkiness"
  | "likes";

export type MethodsTableColumnOption = {
  id: MethodsTableColumnId;
  label: string;
  description: string;
};

export const REQUIRED_METHODS_TABLE_COLUMN_ID = "methodName";

export type MethodsTableFieldsState = {
  orderedColumnIds: MethodsTableColumnId[];
  visibleColumnIds: MethodsTableColumnId[];
};

const METHODS_TABLE_COLUMN_META: Record<MethodsTableColumnId, MethodsTableColumnOption> = {
  requirements: {
    id: "requirements",
    label: "Requirements",
    description: "Shows the skill requirements needed to use the method or variant.",
  },
  methodName: {
    id: "methodName",
    label: "Method Name",
    description: "Shows the method name and its main icon, linking to the method detail page.",
  },
  members: {
    id: "members",
    label: "Members",
    description: "Shows whether the method or variant is for members or free-to-play accounts.",
  },
  variant: {
    id: "variant",
    label: "Variant",
    description: "Shows the specific variant name when a method has multiple setups or routes.",
  },
  gpPerHr: {
    id: "gpPerHr",
    label: "Gp/Hr",
    description: "Shows the estimated high and low profit per hour for the method.",
  },
  tags: {
    id: "tags",
    label: "Tags",
    description: "Shows backend-generated tags that highlight variant conditions, warnings, or notable traits.",
  },
  gpPerXp: {
    id: "gpPerXp",
    label: "Gp/XP",
    description: "Shows the gold gained or spent per experience point, using high and low values.",
  },
  liquidityScore: {
    id: "liquidityScore",
    label: "Market impact",
    description: "Shows how much the required trading volume is expected to move the market.",
  },
  xpPerHr: {
    id: "xpPerHr",
    label: "XP/Hr",
    description: "Shows the experience gained per hour for the skills trained by the method.",
  },
  clickIntensity: {
    id: "clickIntensity",
    label: "Click Intensity",
    description: "Shows the estimated clicks per hour needed to perform the method.",
  },
  afkiness: {
    id: "afkiness",
    label: "% AFK",
    description: "Shows how AFK-friendly the method is as a percentage.",
  },
  likes: {
    id: "likes",
    label: "Likes",
    description:
      "Shows the total likes received across the method's variants.",
  },
};

function buildMethodsTableColumns(
  columnIds: MethodsTableColumnId[],
): MethodsTableColumnOption[] {
  return columnIds.map((columnId) => METHODS_TABLE_COLUMN_META[columnId]);
}

const DEFAULT_METHODS_TABLE_COLUMNS = buildMethodsTableColumns([
  "methodName",
  "gpPerHr",
  "tags",
  "liquidityScore",
  "xpPerHr",
  "clickIntensity",
  "afkiness",
  "requirements",
  "members",
  "likes",
]);

const SKILL_METHODS_TABLE_COLUMNS = buildMethodsTableColumns([
  "requirements",
  "methodName",
  "variant",
  "members",
  "gpPerHr",
  "tags",
  "gpPerXp",
  "liquidityScore",
  "xpPerHr",
  "clickIntensity",
  "afkiness",
  "likes",
]);

export function getMethodsTableColumns(
  isSkillTable: boolean,
): MethodsTableColumnOption[] {
  return isSkillTable
    ? SKILL_METHODS_TABLE_COLUMNS
    : DEFAULT_METHODS_TABLE_COLUMNS;
}

export function getDefaultMethodsTableColumnIds(
  isSkillTable: boolean,
): MethodsTableColumnId[] {
  return getMethodsTableColumns(isSkillTable).map((column) => column.id);
}

export function getMethodsTableColumnStorageKey(
  userId: string,
  isSkillTable: boolean,
): string {
  return `rsmethods:methods-table-columns:${userId}:${isSkillTable ? "skill" : "default"}`;
}

export function getLegacyMethodsTableColumnStorageKey(
  userId: string,
  isSkillTable: boolean,
): string {
  return `osrstool:methods-table-columns:${userId}:${isSkillTable ? "skill" : "default"}`;
}

export function getMethodsTableColumnStorageKeys(userId: string): string[] {
  return [
    getMethodsTableColumnStorageKey(userId, false),
    getMethodsTableColumnStorageKey(userId, true),
    getLegacyMethodsTableColumnStorageKey(userId, false),
    getLegacyMethodsTableColumnStorageKey(userId, true),
  ];
}

export function sanitizeMethodsTableColumnIds(
  value: unknown,
  isSkillTable: boolean,
): MethodsTableColumnId[] {
  if (!Array.isArray(value)) return [];

  const validIds = new Set(
    getMethodsTableColumns(isSkillTable).map((column) => column.id),
  );

  const sanitizedIds = value.filter(
    (columnId): columnId is MethodsTableColumnId =>
      typeof columnId === "string" && validIds.has(columnId as MethodsTableColumnId),
  );

  return Array.from(new Set(sanitizedIds));
}

function ensureRequiredVisibleColumn(
  visibleColumnIds: MethodsTableColumnId[],
): MethodsTableColumnId[] {
  if (visibleColumnIds.includes(REQUIRED_METHODS_TABLE_COLUMN_ID)) {
    return visibleColumnIds;
  }

  return [
    REQUIRED_METHODS_TABLE_COLUMN_ID,
    ...visibleColumnIds,
  ];
}

function appendMissingColumnIds(
  orderedColumnIds: MethodsTableColumnId[],
  defaultColumnIds: MethodsTableColumnId[],
): MethodsTableColumnId[] {
  return [
    ...orderedColumnIds,
    ...defaultColumnIds.filter((columnId) => !orderedColumnIds.includes(columnId)),
  ];
}

export function getDefaultMethodsTableFieldsState(
  isSkillTable: boolean,
): MethodsTableFieldsState {
  const defaultColumnIds = getDefaultMethodsTableColumnIds(isSkillTable);
  const hiddenColumnIds = new Set<MethodsTableColumnId>(
    isSkillTable ? ["liquidityScore"] : ["liquidityScore", "clickIntensity"],
  );

  return {
    orderedColumnIds: defaultColumnIds,
    visibleColumnIds: defaultColumnIds.filter(
      (columnId) => !hiddenColumnIds.has(columnId),
    ),
  };
}

export function sanitizeMethodsTableFieldsState(
  value: unknown,
  isSkillTable: boolean,
): MethodsTableFieldsState {
  const defaultState = getDefaultMethodsTableFieldsState(isSkillTable);

  if (Array.isArray(value)) {
    const visibleColumnIds = sanitizeMethodsTableColumnIds(value, isSkillTable);
    if (visibleColumnIds.length === 0) return defaultState;

    return {
      orderedColumnIds: defaultState.orderedColumnIds,
      visibleColumnIds: ensureRequiredVisibleColumn(visibleColumnIds),
    };
  }

  if (!value || typeof value !== "object") {
    return defaultState;
  }

  const rawState = value as Partial<MethodsTableFieldsState> & {
    order?: unknown;
    visible?: unknown;
  };

  const orderedColumnIds = sanitizeMethodsTableColumnIds(
    rawState.orderedColumnIds ?? rawState.order,
    isSkillTable,
  );
  const visibleColumnIds = sanitizeMethodsTableColumnIds(
    rawState.visibleColumnIds ?? rawState.visible,
    isSkillTable,
  );

  const nextOrderedColumnIds =
    orderedColumnIds.length > 0
      ? appendMissingColumnIds(orderedColumnIds, defaultState.orderedColumnIds)
      : defaultState.orderedColumnIds;

  const nextVisibleColumnIds =
    visibleColumnIds.length > 0
      ? ensureRequiredVisibleColumn(visibleColumnIds).filter((columnId) =>
          nextOrderedColumnIds.includes(columnId),
        )
      : defaultState.visibleColumnIds;

  return {
    orderedColumnIds: nextOrderedColumnIds,
    visibleColumnIds: nextVisibleColumnIds,
  };
}
