import type { ProductSpecGroup } from "@/types/product";
import { cn } from "@/lib/utils";

/**
 * Clean, grouped technical-specification list for the "ტექნიკური
 * მახასიათებლები" section. Uses semantic <dl>/<dt>/<dd> pairs (rather than a
 * literal <table>) so it stays screen-reader friendly and never needs
 * horizontal scrolling on mobile.
 */
export function ProductSpecs({ groups, className }: { groups: ProductSpecGroup[]; className?: string }) {
  if (!groups.length) return null;

  return (
    <div className={cn("grid grid-cols-1 gap-x-8 gap-y-7 lg:grid-cols-2", className)}>
      {groups.map((group) => (
        <div key={group.group}>
          <h3 className="text-h3 mb-3 text-text">{group.group}</h3>
          <dl className="divide-y divide-border overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
            {group.items.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-small text-text-muted">{item.label}</dt>
                <dd className="text-small text-right font-medium text-text">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
