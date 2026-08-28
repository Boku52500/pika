import { z } from "zod";
import { customerInputSchema } from "@/server/validation/customer";
import { MAX_CART_LINES } from "@/lib/cart";
import { isCheckoutIdempotencyKey } from "@/lib/checkoutIdempotency";

const addressSnapshotSchema = z.object({
  city: z.string().trim().min(1).max(80),
  street: z.string().trim().min(1).max(200),
  building: z.string().trim().max(40).optional(),
  apartment: z.string().trim().max(40).optional(),
  entrance: z.string().trim().max(40).optional(),
  floor: z.string().trim().max(20).optional(),
  additionalInfo: z.string().trim().max(500).optional(),
});

const selectedVariantSchema = z.object({
  attributeSlug: z.string().trim().min(1),
  optionSlug: z.string().trim().min(1),
});

export const orderSubmissionSchema = z.object({
  customerId: z.string().trim().min(1).nullable().optional(),
  checkoutIdempotencyKey: z
    .string()
    .trim()
    .refine(isCheckoutIdempotencyKey, "შეკვეთის იდენტიფიკატორი არასწორია"),
  customer: customerInputSchema,
  address: addressSnapshotSchema,
  deliveryMethod: z.enum(["standard", "express"]),
  paymentMethod: z
    .enum([
      "card",
      "installment",
      "cash-on-delivery",
      "cash_on_delivery",
      "google_pay",
      "apple_pay",
      "bog_loan",
      "bnpl",
      "saved_card",
    ])
    .transform((value) => (value === "cash-on-delivery" ? "cash_on_delivery" : value)),
  installmentMonths: z.number().int().positive().nullable().optional(),
  promoCode: z.string().trim().max(40).nullable().optional(),
  saveCardConsent: z.enum(["recurrent"]).nullable().optional(),
  savedPaymentMethodId: z.string().trim().min(1).nullable().optional(),
  googlePayToken: z.string().min(1).max(200_000).nullable().optional(),
  applePayExternal: z.boolean().optional(),
  loanMonth: z.number().int().positive().nullable().optional(),
  loanDiscountCode: z.string().trim().max(80).nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        variantId: z.string().trim().min(1).optional(),
        quantity: z.number().int().min(1).max(99),
        selectedVariants: z.array(selectedVariantSchema).optional(),
      }),
    )
    .min(1)
    .max(MAX_CART_LINES, "კალათაში ძალიან ბევრი პოზიციაა"),
});

export type OrderSubmissionInput = z.infer<typeof orderSubmissionSchema>;
