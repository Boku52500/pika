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
import { SectionHeading } from "@/components/ui/SectionHeading";
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
    <section className="py-10 sm:py-14">
      <Container>
        <SectionHeading
          eyebrow="კატეგორიები"
          title="იპოვე ის, რაც გჭირდება"
          description="დაათვალიერე ჩვენი ყველაზე მოთხოვნადი კატეგორიები"
          className="mb-6 sm:mb-8"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {featuredCategories.map((category) => {
            const Icon = iconByVisual[category.visual];
            return (
              <Link
                key={category.id}
                href={category.href}
                className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md sm:flex-col sm:items-start sm:gap-0 sm:p-5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white sm:mb-4 sm:size-14">
                  <Icon className="size-5 sm:size-7" strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-small truncate font-semibold text-text sm:text-body">
                    {category.name}
                  </h3>
                  {category.productCount ? (
                    <p className="tnum mt-0.5 truncate text-[0.75rem] text-text-faint sm:text-small">
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
