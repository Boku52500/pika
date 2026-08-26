import { PackageSearch } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function ProductNotFound() {
  return (
    <Container className="flex flex-col items-center gap-5 py-24 text-center sm:py-32">
      <span className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-text-faint">
        <PackageSearch className="size-8" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-h2 text-text">პროდუქტი ვერ მოიძებნა</h1>
        <p className="text-body mx-auto max-w-md text-text-muted">
          სამწუხაროდ, ეს პროდუქტი აღარ არის ხელმისაწვდომი ან მისამართი არასწორია. გთხოვთ, გადაამოწმოთ ბმული ან
          გააგრძელოთ ძიება კატალოგში.
        </p>
      </div>
      <Button href="/" size="lg">
        მთავარ გვერდზე დაბრუნება
      </Button>
    </Container>
  );
}
