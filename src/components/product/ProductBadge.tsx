import { Flame, TrendingUp, Clock3, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { ProductBadgeData, ProductBadgeKind } from "@/types/product";

type BadgeTone = "danger" | "brand" | "accent" | "ink" | "success" | "neutral";

const kindConfig: Partial<Record<ProductBadgeKind, { label: string; tone: BadgeTone; icon?: LucideIcon }>> = {
  bestseller: { label: "ბესტსელერი", tone: "accent", icon: Flame },
  "top-seller": { label: "ტოპ გაყიდვა", tone: "brand", icon: TrendingUp },
  limited: { label: "შეზღუდული რაოდენობა", tone: "ink", icon: Clock3 },
};

/** Renders one of the canonical merchandising badges from `Product["badge"]`. */
export function ProductBadge({ badge, className }: { badge: ProductBadgeData; className?: string }) {
  const cfg = kindConfig[badge.kind];
  const Icon = cfg?.icon;
  const tone: BadgeTone = cfg?.tone ?? "ink";
  const label = badge.label ?? cfg?.label ?? "";

  return (
    <Badge tone={tone} className={cn("gap-1", className)}>
      {Icon ? <Icon className="size-3" strokeWidth={2.25} /> : null}
      {label}
    </Badge>
  );
}

/** Discount percentage badge, e.g. "-13%". */
export function DiscountBadge({ percent, className }: { percent: number; className?: string }) {
  return (
    <Badge tone="danger" className={className}>
      -{percent}%
    </Badge>
  );
}

/** "ახალი" (new arrival) badge. */
export function NewBadge({ className }: { className?: string }) {
  return (
    <Badge tone="brand" className={className}>
      ახალი
    </Badge>
  );
}
