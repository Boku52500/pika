import { z } from "zod";

const amountValue = z.union([z.string(), z.number()]);

export const bogTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
});

export const bogCreateOrderResponseSchema = z.object({
  id: z.string().min(1),
  _links: z.object({
    details: z.object({ href: z.string().optional() }).optional(),
    redirect: z.object({ href: z.string().min(1) }),
  }),
});

export const bogPaymentDetailsSchema = z.object({
  order_id: z.string().min(1),
  external_order_id: z.string().optional(),
  capture: z.string().optional(),
  order_status: z.object({
    key: z.string().min(1),
    value: z.string().optional(),
  }),
  purchase_units: z
    .object({
      request_amount: amountValue.optional(),
      transfer_amount: amountValue.optional(),
      refund_amount: amountValue.optional(),
      currency_code: z.string().optional(),
    })
    .optional(),
  payment_detail: z
    .object({
      transaction_id: z.string().optional(),
      auth_code: z.string().optional(),
      code: z.string().optional(),
      code_description: z.string().optional(),
      transfer_method: z
        .object({
          key: z.string().optional(),
          value: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  reject_reason: z.string().nullable().optional(),
});

export const bogCallbackEnvelopeSchema = z.object({
  event: z.string().optional(),
  zoned_request_time: z.string().optional(),
  body: bogPaymentDetailsSchema,
});

export type BogCreateOrderResponse = z.infer<typeof bogCreateOrderResponseSchema>;
export type BogPaymentDetails = z.infer<typeof bogPaymentDetailsSchema>;
