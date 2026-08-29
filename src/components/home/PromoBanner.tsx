import { ArrowRight, Clock } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export function PromoBanner() {
  return (
    <section className="py-6 sm:py-8">
      <Container>
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-brand-100 bg-gradient-to-br from-white via-brand-50/40 to-white px-6 py-10 shadow-sm sm:px-10 sm:py-12 lg:px-14">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 select-none text-[10rem] font-black leading-none text-brand-600/10 lg:block"
          >
            %
          </span>

          <div className="relative max-w-xl">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-small font-semibold text-brand-700">
              <Clock className="size-4" strokeWidth={2.25} />
              შეთავაზება 31 აგვისტომდე
            </div>

            <h2 className="text-h2 text-text">განსაკუთრებული შეთავაზებები</h2>
            <p className="text-body mt-3 text-text-muted">
              დაზოგე 40%-მდე ლეპტოპებზე, სმარტფონებზე და აუდიო ტექნიკაზე.
              რაოდენობა შეზღუდულია — არჩევანი გაკეთდეს დროულად.
            </p>

            <Button href="/category/deals" size="lg" className="mt-7">
              შეთავაზებების ნახვა
              <ArrowRight className="size-[18px]" strokeWidth={2.25} />
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
