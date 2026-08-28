import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { primaryNav } from "@/data/nav";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";

/**
 * Category navigation row rendered under the main header.
 * Each link is wrapped so a future mega-menu (a positioned panel opened
 * on hover/focus per item) can be attached later without touching the
 * header markup or layout above it.
 */
export function CategoryNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="კატეგორიები"
      className={cn("hidden border-b border-border bg-surface lg:block", className)}
    >
      <Container className="flex items-start">
        <div className="text-nav mr-5 flex shrink-0 items-center gap-2 self-stretch border-r border-border py-3 pr-5 text-ink-900 xl:mr-6 xl:pr-6">
          <LayoutGrid className="size-[18px]" strokeWidth={2} />
          ყველა კატეგორია
        </div>

        {/*
          Wraps instead of scrolling: with 12 categories there isn't always
          room for a single row, and a hidden horizontal scrollbar makes the
          tail-end items hard to discover/reach on desktop. Wrapping keeps
          every category one click away at any desktop width.
        */}
        <ul className="flex flex-1 flex-wrap items-center gap-x-1 gap-y-0.5 py-1.5">
          {primaryNav.map((item) => (
            <li key={item.id} className="group relative shrink-0">
              <Link
                href={item.href}
                className={cn(
                  "text-nav flex items-center whitespace-nowrap rounded-[var(--radius-sm)] px-2.5 py-1.5 transition-colors xl:px-3",
                  item.highlight
                    ? "font-semibold text-danger-500 hover:text-danger-600"
                    : "text-ink-700 hover:text-brand-600"
                )}
              >
                {item.name}
              </Link>
              {/* Mega-menu insertion point: an absolutely-positioned panel can
                  mount here on group-hover/focus-within without any change
                  to the surrounding nav structure. */}
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  );
}
