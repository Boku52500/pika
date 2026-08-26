"use client";

import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

/**
 * Customer-facing catalogue error. Database details stay in the server log —
 * never shown in the UI, and never silently replaced with mock data.
 */
export function CatalogueError({
  error,
  retry,
  includeChrome = true,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  includeChrome?: boolean;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const body = (
    <Container className="flex flex-col items-center gap-5 py-24 text-center sm:py-32">
      <div className="flex flex-col gap-2">
        <h1 className="text-h2 text-text">კატალოგი დროებით მიუწვდომელია</h1>
        <p className="text-body mx-auto max-w-md text-text-muted">
          პროდუქციის ჩატვირთვა ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან ან დაბრუნდეთ მთავარ გვერდზე.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" size="lg" onClick={retry}>
          თავიდან ცდა
        </Button>
        <Button href="/" size="lg" variant="secondary">
          მთავარ გვერდზე დაბრუნება
        </Button>
      </div>
    </Container>
  );

  if (!includeChrome) return body;

  return (
    <>
      <Header />
      <main className="flex-1">{body}</main>
      <Footer />
    </>
  );
}
