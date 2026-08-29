"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";
import { CATEGORY_NAV_STACK_CLASS } from "@/lib/headerStack";
import { AllCategoriesMenu } from "./AllCategoriesMenu";
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
      <Container className="flex items-center">
        <div className="mr-5 shrink-0 border-r border-border pr-5 xl:mr-6 xl:pr-6">
          <AllCategoriesMenu tree={categoryTree} />
        </div>
        <ul className="flex min-w-0 flex-1 flex-nowrap items-center gap-x-1 overflow-hidden py-1.5">
          {mainNav.map((item) => (
            <li key={item.id} className="shrink-0">
              <Link
                href={item.href}
                className={cn(
                  "text-nav flex items-center whitespace-nowrap rounded-[var(--radius-sm)] px-2.5 py-1.5 transition-colors xl:px-3",
                  item.highlight
                    ? "font-semibold text-danger-500 hover:text-danger-600"
                    : "text-ink-700 hover:text-brand-600",
                )}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  );
}
