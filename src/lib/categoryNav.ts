export type CategoryNavFlat = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  showInMainNav: boolean;
  navSortOrder: number;
  sortOrder: number;
};

export type CategoryNavNode = {
  id: string;
  slug: string;
  name: string;
  href: string;
  highlight: boolean;
  children: CategoryNavNode[];
};

export type MainNavItem = {
  id: string;
  slug: string;
  name: string;
  href: string;
  highlight: boolean;
};

export function categoryHref(slug: string): string {
  return `/category/${slug}`;
}

function toNode(row: CategoryNavFlat, children: CategoryNavNode[]): CategoryNavNode {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    href: categoryHref(row.slug),
    highlight: row.slug === "deals",
    children,
  };
}

/** Full active hierarchy for the "ყველა კატეგორია" menu. Inactive categories are omitted. */
export function buildCategoryNavTree(rows: CategoryNavFlat[]): CategoryNavNode[] {
  const active = rows.filter((row) => row.isActive);
  const byParent = new Map<string | null, CategoryNavFlat[]>();
  for (const row of active) {
    const list = byParent.get(row.parentId) ?? [];
    list.push(row);
    byParent.set(row.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ka"));
  }

  const walk = (parentId: string | null): CategoryNavNode[] =>
    (byParent.get(parentId) ?? []).map((row) => toNode(row, walk(row.id)));

  return walk(null);
}

const MAIN_NAV_FALLBACK_LIMIT = 6;

function toMainNavItem(row: CategoryNavFlat): MainNavItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    href: categoryHref(row.slug),
    highlight: row.slug === "deals",
  };
}

/** Categories the admin marked for the one-line navbar, in nav order. */
export function selectMainNavItems(rows: CategoryNavFlat[]): MainNavItem[] {
  const configured = rows
    .filter((row) => row.isActive && row.showInMainNav)
    .sort((a, b) => a.navSortOrder - b.navSortOrder || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ka"))
    .map(toMainNavItem);

  if (configured.length > 0) return configured;

  return rows
    .filter((row) => row.isActive && row.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ka"))
    .slice(0, MAIN_NAV_FALLBACK_LIMIT)
    .map(toMainNavItem);
}

/** Walk parent pointers in memory — used by tests and as a cycle-check primitive. */
export function parentWouldCycle(
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
