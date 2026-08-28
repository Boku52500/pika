"use server";

import { getSessionCustomer } from "@/server/auth/session";
import { GENERIC_SERVER_ERROR, type ActionResult } from "@/server/actions/result";
import { deleteCustomerSavedPaymentMethod, listCustomerSavedPaymentMethods } from "@/server/payments/bog/savedCard";
import { PaymentUserError } from "@/server/payments/bog/errors";
import { logError } from "@/server/log";
import { revalidatePath } from "next/cache";

export async function deleteMySavedPaymentMethod(input: unknown): Promise<ActionResult> {
  const session = await getSessionCustomer();
  if (!session?.id) return { ok: false, message: "გთხოვთ გაიაროთ ავტორიზაცია." };
  const id =
    typeof input === "object" && input && "id" in input ? String((input as { id: unknown }).id ?? "").trim() : "";
  if (!id) return { ok: false, message: "გადახდის მეთოდი ვერ მოიძებნა" };
  try {
    await deleteCustomerSavedPaymentMethod(session.id, id);
    revalidatePath("/account/payment-methods");
    return { ok: true };
  } catch (error) {
    if (error instanceof PaymentUserError) return { ok: false, message: error.message };
    logError("saved_card.delete_failed", { error });
    return { ok: false, message: GENERIC_SERVER_ERROR };
  }
}

export async function loadMySavedPaymentMethods() {
  const session = await getSessionCustomer();
  if (!session?.id) return [];
  return listCustomerSavedPaymentMethods(session.id);
}
