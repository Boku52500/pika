import type { Metadata } from "next";
import { Noto_Sans_Georgian } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import { auth } from "@/auth";
import { getAppOrigin } from "@/lib/appUrl";
import "./globals.css";

const bodyFont = Noto_Sans_Georgian({
  variable: "--font-body",
  subsets: ["georgian", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getAppOrigin(),
  title: "Pika — ტექნოლოგიების მაღაზია საქართველოში",
  description:
    "Pika — ორიგინალი ტექნიკა და გაჯეტები ოფიციალური გარანტიით. სმარტფონები, ლეპტოპები, ტელევიზორები და აქსესუარები სწრაფი მიწოდებით მთელი საქართველოს მასშტაბით.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="ka" className={`${bodyFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg text-text">
        <AuthSessionProvider session={session}>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
