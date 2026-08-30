"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { scrollHomeLogoToTop } from "@/lib/scrollRestoration";

export function Logo({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <Link
      href="/"
      aria-label="Pika — მთავარი გვერდი"
      className={cn("group inline-flex shrink-0 items-center", className)}
      onClick={(event) => {
        if (pathname !== "/") return;
        event.preventDefault();
        scrollHomeLogoToTop();
      }}
    >
      <Image
        src="/Logo.png"
        alt="Pika"
        width={140}
        height={40}
        priority
        className="h-8 w-auto object-contain sm:h-9"
      />
    </Link>
  );
}
