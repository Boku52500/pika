"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-2xl font-extrabold text-text">ადმინის გვერდი ვერ ჩაიტვირთა</h1>
      <p className="text-small max-w-lg text-text-muted">სცადეთ თავიდან. თუ პრობლემა გრძელდება, შეამოწმეთ სერვერის ლოგი.</p>
      <Button type="button" onClick={reset}>
        თავიდან ცდა
      </Button>
    </div>
  );
}
