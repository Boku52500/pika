"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, Package, Heart, MapPin, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const menuLinks = [
  { href: "/account", label: "ჩემი ანგარიში", icon: User },
  { href: "/account/orders", label: "შეკვეთები", icon: Package },
  { href: "/account/wishlist", label: "რჩეულები", icon: Heart },
  { href: "/account/addresses", label: "მისამართები", icon: MapPin },
];

/**
 * Header account trigger — a plain link to `/login` when logged out; a
 * dropdown with the customer's name and quick account links (+ logout) when
 * logged in. Works the same on mobile since it's just an anchored panel,
 * not a full drawer.
 */
export function HeaderAccountMenu() {
  const { customer, isLoggedIn, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!isLoggedIn || !customer) {
    return (
      <Link
        href="/login"
        aria-label="შესვლა"
        className="relative flex size-10 items-center justify-center rounded-[var(--radius-md)] text-ink-700 transition-colors hover:bg-black/[0.05] hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <User className="size-[21px]" strokeWidth={1.75} />
      </Link>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`ჩემი ანგარიში — ${customer.firstName}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex size-10 items-center justify-center rounded-[var(--radius-md)] text-ink-700 transition-colors hover:bg-black/[0.05] hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
          open && "bg-black/[0.05] text-ink-900"
        )}
      >
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-[0.75rem] font-semibold text-brand-700"
        >
          {customer.firstName.trim().charAt(0) || "P"}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="ჩემი ანგარიში"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-small truncate font-semibold text-text">
              {customer.firstName} {customer.lastName}
            </p>
            <p className="text-label truncate text-text-faint">{customer.email}</p>
          </div>

          <div className="flex flex-col py-1.5">
            {menuLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  role="menuitem"
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-small flex min-h-11 items-center gap-2.5 px-4 py-2.5 text-text transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2"
                >
                  <Icon className="size-4 text-text-faint" strokeWidth={1.75} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-border py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className="text-small flex min-h-11 w-full items-center gap-2.5 px-4 py-2.5 text-danger-500 transition-colors hover:bg-danger-50 focus-visible:outline-none focus-visible:bg-danger-50"
            >
              <LogOut className="size-4" strokeWidth={1.75} />
              გასვლა
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
