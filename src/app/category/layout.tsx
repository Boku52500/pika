import { StorefrontHeader } from "@/components/layout/StorefrontHeader";
import { Footer } from "@/components/layout/Footer";

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StorefrontHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
