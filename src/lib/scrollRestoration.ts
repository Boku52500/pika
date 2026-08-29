/** Whether a pathname change should jump the window to the top. */
export function shouldForceScrollTop(input: { hash: string; isHistoryTraversal: boolean }): boolean {
  if (input.hash) return false;
  if (input.isHistoryTraversal) return false;
  return true;
}
