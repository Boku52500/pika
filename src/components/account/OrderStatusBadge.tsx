import { Clock, Loader2, Truck, PackageCheck, XCircle } from "lucide-react";
import type { OrderStatus } from "@/types/account";
import { cn } from "@/lib/utils";

/**
 * Order status labels are always shown as Georgian text + an icon — never
 * color alone — so the status is legible even without relying on color
 * perception.
 */
export const orderStatusLabel: Record<OrderStatus, string> = {
  received: "მიღებულია",
  processing: "მუშავდება",
  shipped: "გაგზავნილია",
  delivered: "მიწოდებულია",
  cancelled: "გაუქმებულია",
};

const statusIcon: Record<OrderStatus, typeof Clock> = {
  received: Clock,
  processing: Loader2,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
};

const statusStyle: Record<OrderStatus, string> = {
  received: "border-brand-200 bg-brand-50 text-brand-700",
  processing: "border-warning-500/25 bg-warning-50 text-warning-500",
  shipped: "border-accent-200 bg-accent-50 text-accent-700",
  delivered: "border-success-500/25 bg-success-50 text-success-600",
  cancelled: "border-danger-500/25 bg-danger-50 text-danger-500",
};

function resolveStatus(status: OrderStatus | string): OrderStatus {
  return status in orderStatusLabel ? (status as OrderStatus) : "received";
}

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const resolved = resolveStatus(status);
  const Icon = statusIcon[resolved];
  return (
    <span
      className={cn(
        "text-label inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium normal-case tracking-normal",
        statusStyle[resolved],
        className
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {orderStatusLabel[resolved]}
    </span>
  );
}
