import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LoginPageClient } from "@/components/auth/LoginPageClient";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: "შესვლა — Pika",
  description: "შედით თქვენს Pika ანგარიშში.",
  ...noIndexMetadata,
};

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Suspense fallback={null}>
          <LoginPageClient />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
