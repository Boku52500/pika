import { Container } from "@/components/ui/Container";
import { HeroCarousel } from "./HeroCarousel";

export function Hero() {
  return (
    <section className="bg-bg py-5 sm:py-7 lg:py-8">
      <Container>
        <HeroCarousel />
      </Container>
    </section>
  );
}
