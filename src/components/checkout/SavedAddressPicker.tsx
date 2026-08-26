"use client";

import type { SavedAddress } from "@/types/account";
import { formatAddressLines, toDeliveryAddress } from "@/lib/addressFormat";
import { cn } from "@/lib/utils";

/** Lets a logged-in customer apply a saved address onto the checkout form without making login required. */
export function SavedAddressPicker({
  addresses,
  onSelect,
  className,
}: {
  addresses: SavedAddress[];
  onSelect: (address: SavedAddress) => void;
  className?: string;
}) {
  if (addresses.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-5 sm:p-6", className)}>
      <div>
        <h2 className="text-h3 text-text">შენახული მისამართები</h2>
        <p className="text-small mt-1 text-text-muted">აირჩიეთ შენახული მისამართი ან შეავსეთ ქვემოთ ხელით.</p>
      </div>
      <div className="flex flex-col gap-2">
        {addresses.map((address) => (
          <button
            key={address.id}
            type="button"
            onClick={() => onSelect(address)}
            className="flex min-h-11 flex-col items-start gap-1 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3.5 py-3 text-left transition-colors hover:border-border-strong hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <span className="text-small flex flex-wrap items-center gap-2 font-medium text-text">
              {address.label || "მისამართი"}
              {address.isDefault ? (
                <span className="text-label rounded-full bg-brand-50 px-2 py-0.5 font-medium normal-case tracking-normal text-brand-700">
                  ძირითადი
                </span>
              ) : null}
            </span>
            <span className="text-label text-text-muted">{formatAddressLines(toDeliveryAddress(address)).join(", ")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
