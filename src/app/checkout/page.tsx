import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CheckoutPageClient } from "@/components/checkout/CheckoutPageClient";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: "შეკვეთის გაფორმება — Pika",
  description: "დაასრულეთ შეკვეთა — მიწოდების და გადახდის დეტალები.",
  ...noIndexMetadata,
};

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <CheckoutPageClient />
      </main>
      <Footer />
    </>
  );
}
