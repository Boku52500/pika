import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ResetPasswordPageClient } from "@/components/auth/ResetPasswordPageClient";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: "ახალი პაროლი — Pika",
  description: "დააყენეთ ახალი პაროლი Pika ანგარიშისთვის.",
  ...noIndexMetadata,
};

export default function ResetPasswordPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Suspense>
          <ResetPasswordPageClient />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
