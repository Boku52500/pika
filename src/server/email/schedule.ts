import "server-only";

import { after } from "next/server";
import { logError } from "@/server/log";

/**
 * Run email work after the HTTP response when Next.js `after()` is available
 * (Server Actions, Route Handlers, Vercel). Falls back to a detached promise
 * if `after()` cannot be scheduled (tests / non-request context).
 *
 * Email failures are swallowed here so they cannot roll back committed
 * order/payment/refund/auth state.
 */
export function scheduleEmail(work: () => Promise<void>): void {
  const run = () =>
    work().catch((error) => {
      logError("email.schedule_failed", { error });
    });

  try {
    after(run);
  } catch {
    void run();
  }
}
