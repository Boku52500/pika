"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { AccountNav } from "./AccountNav";
import type { CategoryNavNode, MainNavItem } from "@/lib/categoryNav";

/** Visual chrome for `/account/*`. Auth is enforced on the server (layout + proxy). */
export function AccountLayoutClient({
  children,
  mainNav = [],
  categoryTree = [],
}: {
  children: ReactNode;
  mainNav?: MainNavItem[];
  categoryTree?: CategoryNavNode[];
}) {
  return (
    <>
      <Header mainNav={mainNav} categoryTree={categoryTree} />
      <main className="flex-1">
        <Container className="py-6 sm:py-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr] lg:gap-8">
            <div>
              <AccountNav />
            </div>
            <div className="min-w-0">{children}</div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
