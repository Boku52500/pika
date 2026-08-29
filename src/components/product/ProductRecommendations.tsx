import { Suspense } from "react";
import { ProductSection } from "@/components/product/ProductSection";
import { ProductRecommendationsSkeleton } from "@/components/product/ProductCarouselSkeleton";
import { loadStorefrontProductRecommendations } from "@/server/catalog/storefront";

async function ProductRecommendationsContent({ slug }: { slug: string }) {
  const data = await loadStorefrontProductRecommendations(slug);
  if (!data) return null;

  return (
    <>
      {data.related.length > 0 ? (
        <ProductSection
          title="მსგავსი პროდუქტები"
          products={data.related}
          layout="carousel"
        />
      ) : null}
      {data.youMightLike.length > 0 ? (
        <ProductSection
          title="შეიძლება მოგეწონოთ"
          products={data.youMightLike}
          layout="carousel"
        />
      ) : null}
    </>
  );
}

export function ProductRecommendations({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<ProductRecommendationsSkeleton />}>
      <ProductRecommendationsContent slug={slug} />
    </Suspense>
  );
}
