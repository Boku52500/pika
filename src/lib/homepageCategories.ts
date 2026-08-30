export type HomepageCategoryFlat = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  showOnHomepage: boolean;
  homepageSortOrder: number;
  sortOrder: number;
  imageUrl: string | null;
  iconKey: string | null;
};

export type HomepageCategorySelected = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  iconKey: string | null;
};

const HOMEPAGE_CATEGORY_FALLBACK_LIMIT = 8;

/**
 * Admin-configured homepage category cards, with a safe top-level fallback
 * when no categories are flagged for the homepage.
 */
export function selectHomepageCategories(rows: HomepageCategoryFlat[]): HomepageCategorySelected[] {
  const configured = rows
    .filter((row) => row.isActive && row.showOnHomepage)
    .sort(
      (a, b) =>
        a.homepageSortOrder - b.homepageSortOrder ||
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name, "ka"),
    );

  if (configured.length > 0) {
    return configured.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      imageUrl: row.imageUrl,
      iconKey: row.iconKey,
    }));
  }

  return rows
    .filter((row) => row.isActive && row.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ka"))
    .slice(0, HOMEPAGE_CATEGORY_FALLBACK_LIMIT)
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      imageUrl: row.imageUrl,
      iconKey: row.iconKey,
    }));
}
