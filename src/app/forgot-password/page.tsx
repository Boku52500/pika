import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ForgotPasswordPageClient } from "@/components/auth/ForgotPasswordPageClient";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: "პაროლის აღდგენა — Pika",
  description: "აღადგინეთ თქვენი Pika ანგარიშის პაროლი.",
  ...noIndexMetadata,
};

export default function ForgotPasswordPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ForgotPasswordPageClient />
      </main>
      <Footer />
    </>
  );
}
