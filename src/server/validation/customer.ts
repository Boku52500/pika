import { z } from "zod";
import { isValidEmail, isValidGeorgianPhone } from "@/lib/checkoutValidation";

export const customerInputSchema = z.object({
  firstName: z.string().trim().min(1, "შეიყვანეთ სახელი").max(80),
  lastName: z.string().trim().min(1, "შეიყვანეთ გვარი").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidEmail, { message: "შეიყვანეთ ვალიდური ელ. ფოსტის მისამართი" }),
  phone: z
    .string()
    .trim()
    .refine(isValidGeorgianPhone, { message: "შეიყვანეთ ვალიდური ნომერი, მაგ: +995 555 12 34 56" }),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;
