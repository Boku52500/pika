import { Container } from "@/components/ui/Container";
import { HeroCarousel } from "./HeroCarousel";
import type { StorefrontHeroSlide } from "@/server/catalog/hero";

export function Hero({ slides }: { slides: StorefrontHeroSlide[] }) {
  if (slides.length === 0) return null;

  return (
    <section className="bg-bg py-5 sm:py-7 lg:py-8">
      <Container>
        <HeroCarousel slides={slides} />
      </Container>
    </section>
  );
}
