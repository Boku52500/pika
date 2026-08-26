import { ArrowRight, Clock } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export function PromoBanner() {
  return (
    <section className="py-6 sm:py-8">
      <Container>
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-brand-600 px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 top-1/2 hidden -translate-y-1/2 select-none text-[13rem] font-black italic leading-none text-white/10 lg:block"
          >
            -40%
          </span>

          <div className="relative max-w-xl">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-small font-semibold text-white">
              <Clock className="size-4" strokeWidth={2.25} />
              შეთავაზება 31 აგვისტომდე
            </div>

            <h2 className="text-h2 text-white">განსაკუთრებული შეთავაზებები</h2>
            <p className="text-body mt-3 text-brand-100">
              დაზოგე 40%-მდე ლეპტოპებზე, სმარტფონებზე და აუდიო ტექნიკაზე.
              რაოდენობა შეზღუდულია — არჩევანი გაკეთდეს დროულად.
            </p>

            <Button
              href="/category/deals"
              size="lg"
              className="mt-7 bg-white text-brand-700 hover:bg-brand-50"
            >
              შეთავაზებების ნახვა
              <ArrowRight className="size-[18px]" strokeWidth={2.25} />
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
