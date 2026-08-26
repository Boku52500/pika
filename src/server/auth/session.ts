import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export const getSessionCustomer = cache(async (): Promise<SessionCustomer | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    email: session.user.email,
    phone: session.user.phone ?? "",
  };
});

export async function requireCustomer(redirectTo = "/account"): Promise<SessionCustomer> {
  const customer = await getSessionCustomer();
  if (!customer) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }
  return customer as SessionCustomer;
}
