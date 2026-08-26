import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { featuredCategories } from "@/data/categories";
import { cn } from "@/lib/utils";

export function AccountEmptyState({
  icon: Icon,
  title,
  description,
  actionHref = featuredCategories[0].href,
  actionLabel = "პროდუქტების დათვალიერება",
  onAction,
  secondaryHref,
  secondaryLabel,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-4 py-12 text-center sm:py-16", className)}>
      <span className="flex size-16 items-center justify-center rounded-full bg-surface-2">
        <Icon className="size-8 text-text-faint" strokeWidth={1.5} />
      </span>
      <div>
        <h2 className="text-h3 text-text">{title}</h2>
        <p className="text-body mt-1.5 max-w-md text-text-muted">{description}</p>
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        {secondaryHref && secondaryLabel ? (
          <Button href={secondaryHref} variant="secondary">
            {secondaryLabel}
          </Button>
        ) : null}
        {onAction ? (
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : (
          <Button href={actionHref}>{actionLabel}</Button>
        )}
      </div>
    </div>
  );
}

