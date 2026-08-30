/** Whether a pathname change should jump the window to the top. */
export function shouldForceScrollTop(input: { hash: string; isHistoryTraversal: boolean }): boolean {
  if (input.hash) return false;
  if (input.isHistoryTraversal) return false;
  return true;
}

/** Same-route header/footer logo click: stay on `/` and jump to the top. */
export function scrollHomeLogoToTop(scrollTo?: (options: ScrollToOptions) => void): void {
  const go = scrollTo ?? ((options) => window.scrollTo(options));
  go({ top: 0, left: 0, behavior: "smooth" });
}
