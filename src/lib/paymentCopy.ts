import type { PaymentAttemptStatus } from "@/generated/prisma/client";

export const PAYMENT_STATUS_COPY: Record<
  | "unpaid"
  | "pending"
  | "processing"
  | "authorized"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "refund_processing"
  | "voided",
  { label: string; title: string; body: string }
> = {
  unpaid: {
    label: "გადაუხდელია",
    title: "შეკვეთა მიღებულია",
    body: "გადახდა ჯერ არ დამუშავებულა.",
  },
  pending: {
    label: "გადახდა მუშავდება",
    title: "გადახდა მუშავდება",
    body: "გადახდის დადასტურებას ველოდებით. ეს გვერდი არ ნიშნავს, რომ თანხა უკვე ჩამოგეჭრათ.",
  },
  processing: {
    label: "გადახდა მუშავდება",
    title: "გადახდა მუშავდება",
    body: "ბანკი ამუშავებს გადახდას. გთხოვთ, დაელოდოთ — თანხის ჩამოჭრა ჯერ დადასტურებული არ არის.",
  },
  authorized: {
    label: "თანხა დაბლოკილია",
    title: "თანხა დაბლოკილია",
    body: "თანხა დროებით დაბლოკილია ბარათზე. ჩამოჭრა დასრულდება მხოლოდ დადასტურების შემდეგ — ეს გვერდი არ ნიშნავს, რომ შეკვეთა უკვე გადახდილია.",
  },
  paid: {
    label: "გადახდილია",
    title: "გადახდა წარმატებით დასრულდა",
    body: "თანხა წარმატებით ჩაირიცხა. შეკვეთას მალე დავამუშავებთ.",
  },
  failed: {
    label: "გადახდა ვერ შესრულდა",
    title: "გადახდა ვერ შესრულდა",
    body: "გადახდა არ დასრულებულა. შეკვეთა შენარჩუნებულია — შეგიძლიათ ხელახლა სცადოთ იმავე შეკვეთაზე.",
  },
  refunded: {
    label: "თანხა დაბრუნებულია",
    title: "თანხა დაბრუნებულია",
    body: "ამ გადახდაზე თანხა დაბრუნებულია.",
  },
  partially_refunded: {
    label: "ნაწილობრივ დაბრუნებულია",
    title: "თანხა ნაწილობრივ დაბრუნებულია",
    body: "ამ გადახდაზე თანხის ნაწილი დაბრუნებულია.",
  },
  refund_processing: {
    label: "თანხის დაბრუნება მუშავდება",
    title: "თანხის დაბრუნება მუშავდება",
    body: "ბანკი ამუშავებს თანხის დაბრუნებას. ეს ჯერ არ ნიშნავს, რომ თანხა უკვე დაბრუნებულია.",
  },
  voided: {
    label: "ავტორიზაცია გაუქმებულია",
    title: "ავტორიზაცია გაუქმებულია",
    body: "დაბლოკილი თანხა გაითავისუფლდა. შეგიძლიათ ხელახლა სცადოთ გადახდა.",
  },
};

export function customerFacingPaymentStatus(
  status: string | null | undefined,
  refundInProgress?: boolean,
): string {
  if (refundInProgress && status !== "refunded") return "refund_processing";
  return status || "pending";
}

export function paymentCopyFor(
  status: string | null | undefined,
): (typeof PAYMENT_STATUS_COPY)[keyof typeof PAYMENT_STATUS_COPY] {
  if (status && status in PAYMENT_STATUS_COPY) {
    return PAYMENT_STATUS_COPY[status as keyof typeof PAYMENT_STATUS_COPY];
  }
  return PAYMENT_STATUS_COPY.pending;
}

export function attemptStatusLabel(status: PaymentAttemptStatus): string {
  return PAYMENT_STATUS_COPY[status]?.label ?? status;
}
