import { Header } from "@/components/layout/Header";
import { getStorefrontNav } from "@/server/catalog/nav";

export async function StorefrontHeader() {
  const { mainNav, categoryTree } = await getStorefrontNav();
  return <Header mainNav={mainNav} categoryTree={categoryTree} />;
}
