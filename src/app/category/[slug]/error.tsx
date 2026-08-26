"use client";

import { CatalogueError } from "@/components/errors/CatalogueError";

export default function CategoryError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <CatalogueError error={error} retry={retry} includeChrome={false} />;
}
