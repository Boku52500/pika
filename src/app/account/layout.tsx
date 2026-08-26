import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireCustomer } from "@/server/auth/session";
import { AccountLayoutClient } from "@/components/account/AccountLayoutClient";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: "ანგარიში — Pika",
  ...noIndexMetadata,
};

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireCustomer("/account");
  return <AccountLayoutClient>{children}</AccountLayoutClient>;
}
