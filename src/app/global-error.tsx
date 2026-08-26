"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ka">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 bg-white p-8 text-center text-zinc-900">
        <h1 className="text-2xl font-extrabold">გვერდი დროებით მიუწვდომელია</h1>
        <p className="max-w-md text-sm text-zinc-600">
          სერვერზე შეცდომა მოხდა. სცადეთ თავიდან. თუ პრობლემა გრძელდება, დაბრუნდით მოგვიანებით.
        </p>
        <Button type="button" onClick={retry}>
          თავიდან ცდა
        </Button>
      </body>
    </html>
  );
}
