"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";
import { CATEGORY_NAV_STACK_CLASS } from "@/lib/headerStack";
import { CategoryIcon } from "@/lib/categoryIcons";
import { CategoryMegaMenu } from "./CategoryMegaMenu";
import type { CategoryNavNode, MainNavItem } from "@/lib/categoryNav";

export function CategoryNav({
  className,
  mainNav = [],
  categoryTree = [],
}: {
  className?: string;
  mainNav?: MainNavItem[];
  categoryTree?: CategoryNavNode[];
}) {
  return (
    <nav
      aria-label="კატეგორიები"
      className={cn("hidden border-b border-border bg-surface lg:block", CATEGORY_NAV_STACK_CLASS, className)}
    >
      <Container className="flex items-center gap-4 py-1.5">
        <div className="shrink-0">
          <CategoryMegaMenu tree={categoryTree} />
        </div>
        <ul className="flex min-w-0 flex-1 flex-nowrap items-center gap-x-0.5 overflow-hidden">
          {mainNav.map((item) => (
            <li key={item.id} className="shrink-0">
              <Link
                href={item.href}
                prefetch={false}
                className={cn(
                  "text-nav flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] px-2 py-1.5 transition-colors xl:gap-2 xl:px-2.5",
                  item.highlight
                    ? "font-semibold text-danger-500 hover:text-danger-600"
                    : "text-ink-700 hover:bg-brand-50 hover:text-brand-600",
                )}
              >
                <CategoryIcon slug={item.slug} className="size-4 shrink-0 xl:size-[18px]" strokeWidth={1.75} />
                <span className="truncate">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  );
}
