import { StorefrontHeader } from "@/components/layout/StorefrontHeader";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <StorefrontHeader />
      <main className="flex-1">
        <Container className="flex flex-col items-center gap-5 py-24 text-center sm:py-32">
          <h1 className="text-h2 text-text">გვერდი ვერ მოიძებნა</h1>
          <p className="text-body mx-auto max-w-md text-text-muted">
            ეს მისამართი არ არსებობს ან აღარ არის ხელმისაწვდომი. გადაამოწმეთ ბმული ან დაბრუნდით მაღაზიაში.
          </p>
          <Button href="/" size="lg">
            მთავარ გვერდზე დაბრუნება
          </Button>
        </Container>
      </main>
      <Footer />
    </>
  );
}
