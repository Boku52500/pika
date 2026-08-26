import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartPageClient } from "@/components/cart/CartPageClient";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: "კალათა — Pika",
  description: "თქვენი კალათა — გადახედეთ დამატებულ პროდუქტებს და გააგრძელეთ შეკვეთა.",
  ...noIndexMetadata,
};

export default function CartPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <CartPageClient />
      </main>
      <Footer />
    </>
  );
}
