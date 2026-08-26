import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RegisterPageClient } from "@/components/auth/RegisterPageClient";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: "რეგისტრაცია — Pika",
  description: "შექმენით ახალი Pika ანგარიში.",
  ...noIndexMetadata,
};

export default function RegisterPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Suspense fallback={null}>
          <RegisterPageClient />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
