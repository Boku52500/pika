import {
  Gamepad2,
  Headphones,
  Laptop,
  Lightbulb,
  Monitor,
  Mouse,
  Percent,
  Smartphone,
  Tablet,
  Tag,
  Tv,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { createElement } from "react";

const slugIcons: Record<string, LucideIcon> = {
  phones: Smartphone,
  "phones-smartphones": Smartphone,
  "phones-apple": Smartphone,
  laptops: Laptop,
  tablets: Tablet,
  tv: Tv,
  televisions: Tv,
  monitors: Monitor,
  gaming: Gamepad2,
  accessories: Mouse,
  audio: Headphones,
  "smart-home": Lightbulb,
  network: Wifi,
  deals: Percent,
  new: Tag,
};

export function categoryIconForSlug(slug: string): LucideIcon {
  if (slugIcons[slug]) return slugIcons[slug];
  const prefix = slug.split("-")[0];
  if (prefix && slugIcons[prefix]) return slugIcons[prefix];
  return Tag;
}

export function CategoryIcon({
  slug,
  className,
  strokeWidth = 1.75,
}: {
  slug: string;
  className?: string;
  strokeWidth?: number;
}) {
  return createElement(categoryIconForSlug(slug), { className, strokeWidth });
}
