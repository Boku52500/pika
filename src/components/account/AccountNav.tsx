"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Package, Heart, MapPin, User, LogOut, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const sections = [
  { href: "/account", label: "მიმოხილვა", icon: LayoutGrid },
  { href: "/account/orders", label: "შეკვეთები", icon: Package },
  { href: "/account/wishlist", label: "რჩეულები", icon: Heart },
  { href: "/account/addresses", label: "მისამართები", icon: MapPin },
  { href: "/account/payment-methods", label: "გადახდის მეთოდები", icon: CreditCard },
  { href: "/account/profile", label: "პროფილი", icon: User },
];

function isActive(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Reusable account navigation — a sidebar on desktop, a horizontally-scrollable chip row on mobile. Same active-section logic drives both. */
export function AccountNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLogout = () => {
    void logout();
  };

  return (
    <>
      <nav aria-label="ანგარიშის ნავიგაცია" className="hidden lg:block">
        <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-surface p-2">
          {sections.map((section) => {
            const active = isActive(pathname, section.href);
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-small flex min-h-11 items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                  active ? "bg-brand-50 text-brand-700" : "text-text-muted hover:bg-surface-2 hover:text-text"
                )}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                {section.label}
              </Link>
            );
          })}

          <div className="mt-1 border-t border-border pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="text-small flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 font-medium text-danger-500 transition-colors hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <LogOut className="size-[18px] shrink-0" strokeWidth={1.75} />
              გასვლა
            </button>
          </div>
        </div>
      </nav>

      <nav aria-label="ანგარიშის ნავიგაცია" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {sections.map((section) => {
          const active = isActive(pathname, section.href);
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-small inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                active ? "border-brand-600 bg-brand-50 text-brand-700" : "border-border bg-surface-2 text-ink-700"
              )}
            >
              <Icon className="size-[15px]" strokeWidth={1.75} />
              {section.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          className="text-small inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface-2 px-3.5 py-2 font-medium text-danger-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <LogOut className="size-[15px]" strokeWidth={1.75} />
          გასვლა
        </button>
      </nav>
    </>
  );
}
