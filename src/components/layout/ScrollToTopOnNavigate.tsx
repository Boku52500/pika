"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { shouldForceScrollTop } from "@/lib/scrollRestoration";

/**
 * Scroll new route navigations to the top without breaking back/forward
 * restoration, hash targets, or same-path search-param updates (filters).
 */
export function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  const skipNext = useRef(false);

  useEffect(() => {
    function onPopState() {
      skipNext.current = true;
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shouldForceScrollTop({ hash: window.location.hash, isHistoryTraversal: skipNext.current })) {
      skipNext.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
