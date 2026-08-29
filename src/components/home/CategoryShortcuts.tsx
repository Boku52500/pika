import Link from "next/link";
import {
  Smartphone,
  Laptop,
  Tablet,
  Tv,
  Monitor,
  Gamepad2,
  Keyboard,
  Headphones,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { featuredCategories } from "@/data/categories";
import { Container } from "@/components/ui/Container";
import type { ProductVisual } from "@/types/product";

const iconByVisual: Record<ProductVisual, LucideIcon> = {
  phone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  tv: Tv,
  monitor: Monitor,
  gaming: Gamepad2,
  keyboard: Keyboard,
  components: Monitor,
  accessory: Monitor,
  audio: Headphones,
  "smart-home": Lightbulb,
  network: Monitor,
};

export function CategoryShortcuts() {
  return (
    <section className="py-8 sm:py-12">
      <Container>
        <div className="mb-6 sm:mb-8">
          <p className="text-label font-semibold text-brand-600">კატეგორიები</p>
          <h2 className="text-h2 mt-1 text-text">იპოვე ის, რაც გჭირდება</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
          {featuredCategories.map((category) => {
            const Icon = iconByVisual[category.visual];
            return (
              <Link
                key={category.id}
                href={category.href}
                className="group flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 text-center shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md sm:p-5"
              >
                <span className="flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white sm:size-14">
                  <Icon className="size-6 sm:size-7" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-small truncate font-semibold text-text sm:text-body">{category.name}</h3>
                  {category.productCount ? (
                    <p className="tnum mt-0.5 text-[0.75rem] text-text-faint sm:text-small">
                      {category.productCount}+ პროდუქტი
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
