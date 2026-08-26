import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CheckoutSuccessClient } from "@/components/checkout/CheckoutSuccessClient";
import { getSessionCustomer } from "@/server/auth/session";
import { getOrderForConfirmation } from "@/server/account/orders";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: "შეკვეთა დადასტურებულია — Pika",
  description: "თქვენი შეკვეთა წარმატებით გაფორმდა.",
  ...noIndexMetadata,
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  const customer = await getSessionCustomer();
  const order = await getOrderForConfirmation(orderId, customer?.id ?? null);

  return (
    <>
      <Header />
      <main className="flex-1">
        <CheckoutSuccessClient order={order} />
      </main>
      <Footer />
    </>
  );
}
