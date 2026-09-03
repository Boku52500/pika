/**
 * Pure category-tree move/reorder planning for admin DnD.
 * Persists via Category.parentId + Category.sortOrder (catalogue tree order).
 */

export type CategoryTreeNode = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

export type CategoryTreeUpdate = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

export type CategoryTreeMovePlan =
  | { ok: true; updates: CategoryTreeUpdate[]; movedId: string; previous: CategoryTreeNode }
  | { ok: false; code: "NOT_FOUND" | "CYCLE" | "INVALID_INDEX" | "UNCHANGED"; message: string };

export function buildParentMap(nodes: CategoryTreeNode[]): Map<string, string | null> {
  return new Map(nodes.map((node) => [node.id, node.parentId]));
}

/** True when assigning parentId to categoryId would create a cycle. */
export function categoryMoveWouldCycle(
  categoryId: string,
  parentId: string | null,
  parentById: Map<string, string | null>,
): boolean {
  if (!parentId) return false;
  if (parentId === categoryId) return true;
  let current: string | null = parentId;
  const seen = new Set<string>([categoryId]);
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = parentById.get(current) ?? null;
  }
  return false;
}

function siblingsOf(
  nodes: CategoryTreeNode[],
  parentId: string | null,
  excludeId?: string,
): CategoryTreeNode[] {
  return nodes
    .filter((node) => node.parentId === parentId && node.id !== excludeId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/**
 * Move `categoryId` under `newParentId` at sibling index `indexAmongSiblings`
 * (0 = first child/root item). Reindexes all siblings under the destination
 * parent, and reindexes the old sibling list when the parent changes.
 */
export function planCategoryTreeMove(input: {
  nodes: CategoryTreeNode[];
  categoryId: string;
  newParentId: string | null;
  indexAmongSiblings: number;
}): CategoryTreeMovePlan {
  const { nodes, categoryId, newParentId, indexAmongSiblings } = input;
  const moving = nodes.find((node) => node.id === categoryId);
  if (!moving) {
    return { ok: false, code: "NOT_FOUND", message: "კატეგორია ვერ მოიძებნა" };
  }

  const parentById = buildParentMap(nodes);
  if (categoryMoveWouldCycle(categoryId, newParentId, parentById)) {
    return {
      ok: false,
      code: "CYCLE",
      message: "კატეგორია ვერ გადავა საკუთარ შთამომავალში",
    };
  }

  if (newParentId && !nodes.some((node) => node.id === newParentId)) {
    return { ok: false, code: "NOT_FOUND", message: "მშობელი კატეგორია ვერ მოიძებნა" };
  }

  const destination = siblingsOf(nodes, newParentId, categoryId);
  if (indexAmongSiblings < 0 || indexAmongSiblings > destination.length) {
    return { ok: false, code: "INVALID_INDEX", message: "არასწორი პოზიცია" };
  }

  const nextDestination = [
    ...destination.slice(0, indexAmongSiblings),
    { ...moving, parentId: newParentId },
    ...destination.slice(indexAmongSiblings),
  ];

  const sameParent = moving.parentId === newParentId;
  const sameIndex =
    sameParent &&
    siblingsOf(nodes, moving.parentId).findIndex((node) => node.id === categoryId) === indexAmongSiblings;
  if (sameIndex) {
    return { ok: false, code: "UNCHANGED", message: "ცვლილება არ არის" };
  }

  const updates = new Map<string, CategoryTreeUpdate>();

  nextDestination.forEach((node, index) => {
    updates.set(node.id, { id: node.id, parentId: newParentId, sortOrder: index });
  });

  if (!sameParent) {
    siblingsOf(nodes, moving.parentId, categoryId).forEach((node, index) => {
      updates.set(node.id, { id: node.id, parentId: moving.parentId, sortOrder: index });
    });
  }

  return {
    ok: true,
    movedId: categoryId,
    previous: moving,
    updates: [...updates.values()],
  };
}

export type CategoryDeleteCheck =
  | { ok: true }
  | { ok: false; code: "HAS_CHILDREN" | "HAS_PRODUCTS"; message: string };

/** Empty leaf categories may be deleted. Children or products must be moved first. */
export function canDeleteCategory(input: { childCount: number; productCount: number }): CategoryDeleteCheck {
  if (input.childCount > 0) {
    return {
      ok: false,
      code: "HAS_CHILDREN",
      message: "ჯერ გადაიტანეთ ქვეკატეგორიები, შემდეგ წაშალეთ",
    };
  }
  if (input.productCount > 0) {
    return {
      ok: false,
      code: "HAS_PRODUCTS",
      message: "კატეგორიას აქვს პროდუქტები — ჯერ გადაიტანეთ პროდუქტები",
    };
  }
  return { ok: true };
}
