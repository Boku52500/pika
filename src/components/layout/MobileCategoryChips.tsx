import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";
import type { MainNavItem } from "@/lib/categoryNav";

export function MobileCategoryChips({ mainNav = [] }: { mainNav?: MainNavItem[] }) {
  if (mainNav.length === 0) return null;
  return (
    <div className="border-b border-border bg-surface py-2.5 lg:hidden">
      <Container>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {mainNav.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "text-small shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 font-medium transition-colors",
                item.highlight
                  ? "border-danger-500/30 bg-danger-50 text-danger-500"
                  : "border-border bg-surface-2 text-ink-700",
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
