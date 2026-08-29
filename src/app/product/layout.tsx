import { StorefrontHeader } from "@/components/layout/StorefrontHeader";
import { Footer } from "@/components/layout/Footer";

/**
 * Shared chrome for every /product/[slug] route (page, loading, not-found)
 * so the skeleton and 404 states still show the real header/footer instead
 * of a bare page.
 */
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StorefrontHeader />
      <main className="flex-1 pb-24 lg:pb-0">{children}</main>
      <Footer />
    </>
  );
}
