import Link from "next/link";
import { MapPin, Phone, Store } from "lucide-react";
import { Container } from "@/components/ui/Container";

export function TopUtilityBar() {
  return (
    <div className="hidden bg-ink-950 text-text-on-ink-muted lg:block">
      <Container className="flex h-9 items-center justify-between text-[0.8125rem]">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5" strokeWidth={2} />
          <span>
            მიწოდება: <span className="font-medium text-text-on-ink">თბილისი</span>
          </span>
        </div>

        <div className="flex items-center gap-5">
          <Link href="/stores" className="flex items-center gap-1.5 transition-colors hover:text-text-on-ink">
            <Store className="size-3.5" strokeWidth={2} />
            მაღაზიები
          </Link>
          <Link href="/support" className="transition-colors hover:text-text-on-ink">
            მომხმარებელთა მხარდაჭერა
          </Link>
          <a href="tel:+995322000000" className="flex items-center gap-1.5 font-medium text-text-on-ink">
            <Phone className="size-3.5" strokeWidth={2} />
            032 200 00 00
          </a>
        </div>
      </Container>
    </div>
  );
}
