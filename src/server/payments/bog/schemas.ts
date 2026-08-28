import { z } from "zod";

/** Optional documented string that BOG may omit, set null, or send as a number. */
const optionalBogString = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) return undefined;
    const text = String(value).trim();
    return text.length > 0 ? text : undefined;
  });

const requiredBogString = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().min(1));

/** Documented monetary fields are strings; production may also send numbers or null. */
const optionalBogAmount = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) return undefined;
    if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(2);
    const text = String(value).trim().replace(",", ".");
    return text.length > 0 ? text : undefined;
  });

function receivedKind(input: unknown): string {
  if (input === null) return "null";
  if (Array.isArray(input)) return "array";
  return typeof input;
}

export type BogValidationIssue = {
  path: string;
  code: string;
  expected?: string;
  received?: string;
};

/** Safe Zod issue metadata for production logs — never includes received values. */
export function bogZodIssues(error: z.ZodError): BogValidationIssue[] {
  return error.issues.slice(0, 20).map((issue) => {
    const row: BogValidationIssue = {
      path: issue.path.map(String).join(".") || "(root)",
      code: issue.code,
    };
    if ("expected" in issue && issue.expected != null) {
      row.expected = String(issue.expected);
    }
    if ("input" in issue) {
      row.received = receivedKind(issue.input);
    }
    return row;
  });
}

const bogOrderStatusSchema = z
  .union([
    z
      .object({
        key: requiredBogString,
        value: optionalBogString,
      })
      .passthrough(),
    requiredBogString,
  ])
  .transform((value): { key: string; value?: string } => {
    if (typeof value === "string") return { key: value.toLowerCase() };
    return { key: value.key.toLowerCase(), ...(value.value ? { value: value.value } : {}) };
  });

const bogTransferMethodSchema = z
  .union([
    z
      .object({
        key: optionalBogString,
        value: optionalBogString,
      })
      .passthrough(),
    z.string(),
    z.null(),
  ])
  .optional()
  .transform((value): { key: string; value?: string } | undefined => {
    if (value == null) return undefined;
    if (typeof value === "string") {
      const key = value.trim().toLowerCase();
      return key ? { key } : undefined;
    }
    const key = value.key?.toLowerCase();
    if (!key) return undefined;
    return { key, ...(value.value ? { value: value.value } : {}) };
  });

const bogPurchaseUnitsObjectSchema = z
  .object({
    request_amount: optionalBogAmount,
    transfer_amount: optionalBogAmount,
    refund_amount: optionalBogAmount,
    currency_code: optionalBogString,
    currency: optionalBogString,
  })
  .passthrough()
  .transform((units) => ({
    ...units,
    currency_code: units.currency_code ?? units.currency,
  }));

const bogPurchaseUnitsSchema = z
  .union([bogPurchaseUnitsObjectSchema, z.array(bogPurchaseUnitsObjectSchema), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) return undefined;
    return Array.isArray(value) ? value[0] : value;
  });

const bogPaymentDetailSchema = z
  .object({
    transfer_method: bogTransferMethodSchema,
    transaction_id: optionalBogString,
    auth_code: optionalBogString,
    code: optionalBogString,
    code_description: optionalBogString,
    payment_option: optionalBogString,
    card_type: optionalBogString,
    payer_identifier: optionalBogString,
    card_expiry_date: optionalBogString,
    saved_card_type: optionalBogString,
    parent_order_id: optionalBogString,
  })
  .passthrough()
  .nullable()
  .optional()
  .transform((value) => value ?? undefined);

const bogSplitSchema = z
  .object({
    split_status: optionalBogString,
    currency: optionalBogString,
    request_channel: optionalBogString,
  })
  .passthrough()
  .nullable()
  .optional()
  .transform((value) => value ?? undefined);

type BogAction = {
  action_id: string;
  action?: string;
  status?: string;
  amount?: string;
};

const bogActionObjectSchema = z
  .object({
    action_id: optionalBogString,
    action: optionalBogString,
    status: optionalBogString,
    amount: optionalBogAmount,
  })
  .passthrough();

const bogActionsSchema = z
  .union([z.array(bogActionObjectSchema), z.null()])
  .optional()
  .transform((value): BogAction[] | undefined => {
    if (value == null) return undefined;
    const actions: BogAction[] = [];
    for (const row of value) {
      if (!row.action_id) continue;
      actions.push({
        action_id: row.action_id,
        action: row.action?.toLowerCase(),
        status: row.status?.toLowerCase(),
        amount: row.amount,
      });
    }
    return actions.length > 0 ? actions : undefined;
  });

/**
 * Canonical BOG payment-details object (GET /payments/v1/receipt/:order_id
 * and callback `body`). Extra documented provider fields are ignored, not rejected.
 */
export const bogPaymentDetailsSchema = z
  .object({
    order_id: requiredBogString,
    external_order_id: optionalBogString,
    capture: optionalBogString,
    order_status: bogOrderStatusSchema,
    purchase_units: bogPurchaseUnitsSchema,
    payment_detail: bogPaymentDetailSchema,
    actions: bogActionsSchema,
    split: bogSplitSchema,
    reject_reason: optionalBogString,
  })
  .passthrough();

export const bogRefundResponseSchema = z
  .object({
    key: requiredBogString,
    message: optionalBogString,
    action_id: requiredBogString,
  })
  .passthrough();

export const BOG_REFUND_ACCEPTED_KEY = "request_received";

export const bogCallbackEnvelopeSchema = z
  .object({
    event: z
      .string()
      .trim()
      .transform((value) => value.toLowerCase())
      .pipe(z.literal("order_payment")),
    zoned_request_time: z.string().min(1),
    body: bogPaymentDetailsSchema,
  })
  .passthrough();

export const bogTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
});

export const bogCreateOrderResponseSchema = z
  .object({
    id: z.string().min(1),
    status: optionalBogString,
    result: z.unknown().optional(),
    order_details: z.unknown().optional(),
    _links: z
      .object({
        details: z.object({ href: z.string().optional() }).optional(),
        redirect: z.object({ href: z.string().min(1) }).optional(),
        accept: z.object({ href: z.string().min(1) }).optional(),
      })
      .optional(),
  })
  .passthrough();

export type BogCreateOrderResponse = z.infer<typeof bogCreateOrderResponseSchema>;

export type BogPaymentDetails = {
  order_id: string;
  external_order_id?: string;
  capture?: string;
  order_status: { key: string; value?: string };
  purchase_units?: {
    request_amount?: string;
    transfer_amount?: string;
    refund_amount?: string;
    currency_code?: string;
  };
  payment_detail?: {
    transfer_method?: { key?: string; value?: string };
    transaction_id?: string;
    auth_code?: string;
    code?: string;
    code_description?: string;
    payment_option?: string;
    card_type?: string;
    payer_identifier?: string;
    card_expiry_date?: string;
    saved_card_type?: string;
    parent_order_id?: string;
  };
  actions?: Array<{
    action_id: string;
    action?: string;
    status?: string;
    amount?: string;
  }>;
  split?: {
    split_status?: string;
    currency?: string;
    request_channel?: string;
  };
  reject_reason?: string;
};

export type BogRefundResponse = {
  key: string;
  message?: string;
  action_id: string;
};

export type BogCallbackEnvelope = {
  event: "order_payment";
  zoned_request_time: string;
  body: BogPaymentDetails;
};

export function canonicalizeBogPaymentDetails(
  data: z.output<typeof bogPaymentDetailsSchema>,
): BogPaymentDetails {
  return {
    order_id: data.order_id,
    external_order_id: data.external_order_id,
    capture: data.capture,
    order_status: { key: data.order_status.key, value: data.order_status.value },
    purchase_units: data.purchase_units
      ? {
          request_amount: data.purchase_units.request_amount,
          transfer_amount: data.purchase_units.transfer_amount,
          refund_amount: data.purchase_units.refund_amount,
          currency_code: data.purchase_units.currency_code,
        }
      : undefined,
    payment_detail: data.payment_detail
      ? {
          transfer_method: data.payment_detail.transfer_method,
          transaction_id: data.payment_detail.transaction_id,
          auth_code: data.payment_detail.auth_code,
          code: data.payment_detail.code,
          code_description: data.payment_detail.code_description,
          payment_option: data.payment_detail.payment_option,
          card_type: data.payment_detail.card_type,
          payer_identifier: data.payment_detail.payer_identifier,
          card_expiry_date: data.payment_detail.card_expiry_date,
          saved_card_type: data.payment_detail.saved_card_type,
          parent_order_id: data.payment_detail.parent_order_id,
        }
      : undefined,
    actions: data.actions,
    split: data.split
      ? {
          split_status: data.split.split_status,
          currency: data.split.currency,
          request_channel: data.split.request_channel,
        }
      : undefined,
    reject_reason: data.reject_reason,
  };
}
