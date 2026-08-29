"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, MapPin, User, Heart, Store, Phone } from "lucide-react";
import { Logo } from "./Logo";
import { CategoryTreeList } from "./AllCategoriesMenu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { CategoryNavNode, MainNavItem } from "@/lib/categoryNav";

export function MobileMenu({
  open,
  onClose,
  mainNav = [],
  categoryTree = [],
}: {
  open: boolean;
  onClose: () => void;
  mainNav?: MainNavItem[];
  categoryTree?: CategoryNavNode[];
}) {
  const { customer, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="მენიუს დახურვა"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink-950/50 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="მენიუ"
        className={cn(
          "absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-surface shadow-lg transition-transform duration-250 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Logo />
          <button
            type="button"
            aria-label="მენიუს დახურვა"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-ink-700 hover:bg-black/[0.05]"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-2 border-b border-border p-4">
            <Link
              href={isLoggedIn ? "/account" : "/login"}
              onClick={onClose}
              className="flex min-h-11 flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2.5 text-small font-medium text-ink-800"
            >
              <User className="size-4" strokeWidth={2} />
              {isLoggedIn ? customer?.firstName ?? "ანგარიში" : "შესვლა"}
            </Link>
            <Link
              href={isLoggedIn ? "/account/wishlist" : "/login?redirect=%2Faccount%2Fwishlist"}
              onClick={onClose}
              className="flex min-h-11 flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2.5 text-small font-medium text-ink-800"
            >
              <Heart className="size-4" strokeWidth={2} />
              სურვილები
            </Link>
          </div>

          <nav aria-label="კატეგორიები" className="flex flex-col p-2">
            <p className="px-3 py-2 text-label text-text-faint">ყველა კატეგორია</p>
            {categoryTree.length > 0 ? (
              <CategoryTreeList nodes={categoryTree} onNavigate={onClose} />
            ) : (
              mainNav.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "text-nav rounded-[var(--radius-sm)] px-3 py-3 transition-colors",
                    item.highlight ? "font-semibold text-danger-500" : "text-ink-800 hover:bg-black/[0.04]",
                  )}
                >
                  {item.name}
                </Link>
              ))
            )}
          </nav>

          <div className="border-t border-border p-4 text-small text-text-muted">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="size-4" strokeWidth={2} />
              მიწოდება: <span className="font-medium text-text">თბილისი</span>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <Store className="size-4" strokeWidth={2} />
              <Link href="/stores">მაღაზიების სია</Link>
            </div>
            <a href="tel:+995322000000" className="flex items-center gap-2 font-medium text-text">
              <Phone className="size-4" strokeWidth={2} />
              032 200 00 00
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
