import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { CategoryShortcuts } from "@/components/home/CategoryShortcuts";
import { PromoBanner } from "@/components/home/PromoBanner";
import { TrustSection } from "@/components/home/TrustSection";
import { ProductSection } from "@/components/product/ProductSection";
import { getHomepageFeaturedProducts, getHomepageNewArrivals } from "@/server/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featuredProducts, newArrivals] = await Promise.all([
    getHomepageFeaturedProducts(),
    getHomepageNewArrivals(),
  ]);

  return (
    <>
      <Header />

      <main className="flex-1">
        <Hero />

        <CategoryShortcuts />

        <ProductSection
          eyebrow="შერჩეული ჩვენს მიერ"
          title="რჩეული პროდუქტები"
          description="ყველაზე მოთხოვნადი მოდელები საუკეთესო ფასად"
          href="/category/deals"
          products={featuredProducts}
        />

        <PromoBanner />

        <ProductSection
          eyebrow="ახალი კოლექცია"
          title="ახალი შემოსული"
          description="უახლესი მოდელები, რომლებიც ახლახან შემოვიდა მაღაზიაში"
          href="/category/new"
          products={newArrivals}
        />

        <TrustSection />
      </main>

      <Footer />
    </>
  );
}
