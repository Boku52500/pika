import { CheckCircle2, Clock, Loader2, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { paymentCopyFor } from "@/lib/paymentCopy";

const iconByStatus = {
  paid: CheckCircle2,
  refunded: RotateCcw,
  partially_refunded: RotateCcw,
  refund_processing: Loader2,
  failed: XCircle,
  processing: Loader2,
  pending: Clock,
  unpaid: Clock,
} as const;

const styleByStatus = {
  paid: "border-success-500/25 bg-success-50 text-success-600",
  refunded: "border-warning-500/25 bg-warning-50 text-warning-500",
  partially_refunded: "border-warning-500/25 bg-warning-50 text-warning-500",
  refund_processing: "border-warning-500/25 bg-warning-50 text-warning-500",
  failed: "border-danger-500/25 bg-danger-50 text-danger-500",
  processing: "border-warning-500/25 bg-warning-50 text-warning-500",
  pending: "border-warning-500/25 bg-warning-50 text-warning-500",
  unpaid: "border-border bg-surface-2 text-text-muted",
} as const;

export function PaymentStatusBadge({ status, className }: { status: string; className?: string }) {
  const copy = paymentCopyFor(status);
  const Icon = iconByStatus[status as keyof typeof iconByStatus] ?? Clock;
  const style = styleByStatus[status as keyof typeof styleByStatus] ?? styleByStatus.pending;
  return (
    <span
      className={cn(
        "text-label inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium",
        style,
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {copy.label}
    </span>
  );
}
