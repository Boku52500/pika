import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Pika — მთავარი გვერდი"
      className={cn("group inline-flex shrink-0 items-center", className)}
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
