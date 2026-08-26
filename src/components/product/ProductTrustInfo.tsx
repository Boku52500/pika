import { BadgeCheck, ShieldCheck, Truck, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { icon: BadgeCheck, label: "ოფიციალური პროდუქცია" },
  { icon: ShieldCheck, label: "გარანტია" },
  { icon: Truck, label: "სწრაფი მიწოდება" },
  { icon: Lock, label: "უსაფრთხო გადახდა" },
];

/** Compact, visually subtle trust row shown near the PDP purchase controls. */
export function ProductTrustInfo({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4", className)}>
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-text-faint" strokeWidth={1.75} />
          <span className="text-small text-text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}
